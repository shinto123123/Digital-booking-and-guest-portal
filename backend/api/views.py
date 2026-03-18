from rest_framework.decorators import api_view, parser_classes, permission_classes, authentication_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken

from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import check_password
from django.db.models import Q, Avg, Sum
from django.core.mail import EmailMessage
from django.conf import settings
import datetime
import requests

from api.models import (
    Reservation,
    Room,
    RoomImage,
    Staff,
    Gallery,
    Food,
    FoodOrder,
    Review,
    UserProfile,
    RoomPrice,
)

from .serializers import (
    ReservationSerializer,
    RoomSerializer,
    StaffSerializer,
    GallerySerializer,
    FoodSerializer,
    FoodOrderSerializer,
    FoodOrderCreateSerializer,
    ReviewSerializer,
    ReviewCreateSerializer,
)

# =====================================================
# USER PROFILE - RESERVATIONS & INVOICES
# =====================================================

from django.http import HttpResponse
from django.template.loader import render_to_string
from django.utils import timezone
from datetime import datetime, timedelta
import datetime
import re


# =====================================================
# REVIEWS
# =====================================================

@api_view(["GET", "POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def review_list_create(request):
    """
    GET: List all reviews (for admin)
    POST: Create a new review (for customers after checkout)
    """
    if request.method == "GET":
        reviews = Review.objects.all().order_by("-created_at")
        serializer = ReviewSerializer(reviews, many=True)
        return Response(serializer.data)
    
    # Create new review
    reservation_id = request.data.get("reservation")
    
    # Validate that reservation exists
    try:
        reservation = Reservation.objects.get(pk=reservation_id)
    except Reservation.DoesNotExist:
        return Response(
            {"error": "Reservation not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Allow review once stay is completed:
    # either checkout date has passed OR staff explicitly marked guest as Checked-Out.
    is_checked_out = (reservation.status or "").lower() == "checked-out"
    if timezone.now().date() < reservation.checkout and not is_checked_out:
        return Response(
            {"error": "You can only review after your checkout date"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if review already exists for this reservation
    if Review.objects.filter(reservation=reservation).exists():
        return Response(
            {"error": "You have already reviewed this reservation"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    serializer = ReviewCreateSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )
    
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(["GET", "PATCH", "PUT"])
@permission_classes([AllowAny])
@authentication_classes([])
def review_detail(request, pk):
    """
    GET: Get a specific review
    PATCH/PUT: Update review (admin can reply)
    """
    review = get_object_or_404(Review, pk=pk)
    
    if request.method == "GET":
        return Response(ReviewSerializer(review).data)
    
    # Allow admin to reply to review
    if request.method in ("PATCH", "PUT"):
        serializer = ReviewSerializer(
            review,
            data=request.data,
            partial=request.method == "PATCH"
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def review_by_reservation(request, reservation_id):
    """
    Get review for a specific reservation (for customer to check if they already reviewed)
    """
    try:
        review = Review.objects.get(reservation_id=reservation_id)
        return Response(ReviewSerializer(review).data)
    except Review.DoesNotExist:
        return Response(
            {"error": "No review found for this reservation"},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def get_eligible_reservations_for_review(request):
    """
    Get reservations that are eligible for review (checkout date has passed)
    """
    email = str(request.query_params.get("email", "")).strip()
    username = str(request.query_params.get("username", "")).strip()
    if not email and not username:
        return Response(
            {"error": "Email or username parameter is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    def is_checked_out_status(status_value):
        normalized = re.sub(r"[^a-z]", "", str(status_value or "").lower())
        return normalized == "checkedout"

    base_qs = Reservation.objects.all()
    if email:
        base_qs = base_qs.filter(email__iexact=email)
    elif username:
        base_qs = base_qs.filter(name__iexact=username)

    today = timezone.now().date()
    all_user_reservations = base_qs.order_by("-checkout")
    eligible_reservations = [
        r for r in all_user_reservations
        if (r.checkout and r.checkout <= today) or is_checked_out_status(r.status)
    ]
    
    # Add a field to indicate if review already exists
    result = []
    for res in eligible_reservations:
        has_review = Review.objects.filter(reservation=res).exists()
        result.append({
            "id": res.id,
            "name": res.name,
            "email": res.email,
            "room_type": res.room_type,
            "check_in": res.checkin,
            "check_out": res.checkout,
            "has_review": has_review
        })
    
    return Response(result)


@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def review_stats(request):
    """
    Get review statistics for admin dashboard
    """
    total_reviews = Review.objects.count()
    avg_rating = Review.objects.aggregate(Avg('rating'))['rating__avg'] or 0
    
    # Rating distribution
    rating_distribution = {}
    for i in range(1, 6):
        rating_distribution[i] = Review.objects.filter(rating=i).count()
    
    # Recent reviews
    recent_reviews = Review.objects.order_by("-created_at")[:5]
    
    return Response({
        "total_reviews": total_reviews,
        "average_rating": round(avg_rating, 2),
        "rating_distribution": rating_distribution,
        "recent_reviews": ReviewSerializer(recent_reviews, many=True).data
    })


@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
def user_reservations(request):
    """
    Get all reservations for a specific user by email or username
    """
    email = request.query_params.get("email")
    username = request.query_params.get("username")
    
    # Start with all reservations
    reservations = Reservation.objects.all().order_by("-created_at")
    
    # Filter by email if provided
    if email:
        reservations = reservations.filter(email__iexact=email)
    # Filter by name (for reservations made by logged-in users) if username provided
    elif username:
        reservations = reservations.filter(name__iexact=username)
    
    serializer = ReservationSerializer(reservations, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([AllowAny])
def download_invoice(request, reservation_id):
    """
    Generate and download invoice for a specific reservation
    """
    try:
        reservation = Reservation.objects.get(pk=reservation_id)
    except Reservation.DoesNotExist:
        return Response(
            {"error": "Reservation not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    notes_text = reservation.notes or ""
    add_on_price_map = {
        "campfire setup": 1500.0,
        "room decoration": 2500.0,
        "candle light dinner": 3500.0,
    }
    addon_names_list = []
    for line in str(notes_text).splitlines():
        if line.lower().startswith("add-ons:"):
            value = line.split(":", 1)[1].strip()
            if value and value.lower() != "skipped":
                addon_names_list = [v.strip() for v in value.split(",") if v.strip()]
            break
    addon_total = sum(add_on_price_map.get(name.lower(), 0.0) for name in addon_names_list)
    total_amount = float(reservation.total_amount or 0)
    room_total = max(total_amount - addon_total, 0.0)
    addon_names = ", ".join(addon_names_list) if addon_names_list else "None"
    
    # Generate invoice content as HTML
    invoice_data = {
        "reservation": reservation,
        "invoice_number": f"INV-{reservation.id:06d}",
        "invoice_date": timezone.now().strftime("%Y-%m-%d %H:%M:%S"),
        "company_name": "Eden's Glamp Resort",
        "company_address": "123 Resort Way, Beautiful Location",
        "company_phone": "+91 98765 43210",
        "company_email": "info@edensglamp.com",
    }
    
    # Generate HTML invoice
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice - {invoice_data['invoice_number']}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 40px; }}
        .invoice-container {{ max-width: 800px; margin: 0 auto; }}
        .header {{ text-align: center; margin-bottom: 30px; }}
        .header h1 {{ color: #c89d5c; margin: 0; }}
        .invoice-info {{ display: flex; justify-content: space-between; margin-bottom: 30px; }}
        .info-box {{ background: #f9f9f9; padding: 15px; border-radius: 5px; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }}
        th {{ background: #c89d5c; color: white; }}
        .total-row {{ font-weight: bold; font-size: 18px; }}
        .footer {{ margin-top: 40px; text-align: center; color: #666; }}
        .status {{ padding: 5px 10px; border-radius: 3px; }}
        .status-confirmed {{ background: #d4edda; color: #155724; }}
        .status-pending {{ background: #fff3cd; color: #856404; }}
        .status-cancelled {{ background: #f8d7da; color: #721c24; }}
        @media print {{
            body {{ margin: 0; }}
            .no-print {{ display: none; }}
        }}
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <h1>{invoice_data['company_name']}</h1>
            <p>{invoice_data['company_address']}</p>
            <p>Phone: {invoice_data['company_phone']} | Email: {invoice_data['company_email']}</p>
        </div>
        
        <div class="invoice-info">
            <div class="info-box">
                <h3>Bill To:</h3>
                <p><strong>{reservation.name}</strong></p>
                <p>{reservation.email}</p>
                <p>{reservation.phone}</p>
            </div>
            <div class="info-box">
                <p><strong>Invoice Number:</strong> {invoice_data['invoice_number']}</p>
                <p><strong>Invoice Date:</strong> {invoice_data['invoice_date']}</p>
                <p><strong>Booking ID:</strong> #{reservation.id}</p>
                <p><strong>Status:</strong> 
                    <span class="status status-{reservation.status.lower()}">{reservation.status}</span>
                </p>
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Details</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Room Booking</td>
                    <td>{reservation.room_type} ({reservation.rooms} Room(s))</td>
                    <td>₹{room_total:.2f}</td>
                </tr>
                <tr>
                    <td>Add-ons</td>
                    <td>{addon_names}</td>
                    <td>₹{addon_total:.2f}</td>
                </tr>
                <tr>
                    <td>Check-in Date</td>
                    <td>{reservation.checkin}</td>
                    <td>-</td>
                </tr>
                <tr>
                    <td>Check-out Date</td>
                    <td>{reservation.checkout}</td>
                    <td>-</td>
                </tr>
                <tr>
                    <td>Guests</td>
                    <td>Adults: {reservation.adults}, Children: {reservation.children}</td>
                    <td>-</td>
                </tr>
                <tr class="total-row">
                    <td colspan="2">Total Amount</td>
                    <td>₹{total_amount:.2f}</td>
                </tr>
            </tbody>
        </table>
        
        <div class="footer">
            <p>Thank you for choosing {invoice_data['company_name']}!</p>
            <p>For any queries, please contact us at {invoice_data['company_email']}</p>
            <p class="no-print"><button onclick="window.print()">Print Invoice</button></p>
        </div>
    </div>
</body>
</html>
    """
    
    response = HttpResponse(html_content, content_type="text/html")
    response["Content-Disposition"] = f'attachment; filename="invoice_{invoice_data["invoice_number"]}.html"'
    return response


# =====================================================
# AUTH – REGISTER & LOGIN
# =====================================================

@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def register_user(request):
    username = request.data.get("username")
    email = request.data.get("email", "")
    password = request.data.get("password")
    phone = request.data.get("phone", "")

    if not username or not password:
        return Response(
            {"error": "Username and password are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(username=username).exists():
        return Response(
            {"error": "Username already exists"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if email and User.objects.filter(email=email).exists():
        return Response(
            {"error": "Email already exists"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
    )

    # Create profile with customer role
    try:
        user.profile.phone = phone
        user.profile.role = "customer"
        user.profile.save()
    except:
        UserProfile.objects.create(user=user, phone=phone, role="customer")

    return Response(
        {"message": "User registered successfully"},
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def login_user(request):
    identifier = request.data.get("identifier")  # username OR email
    password = request.data.get("password")

    if not identifier or not password:
        return Response(
            {"error": "Username/email and password required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Special handling for admin credentials (admin/admin123)
    if identifier == "admin" and password == "admin123":
        # Try to get or create admin user
        try:
            user = User.objects.get(username="admin")
        except User.DoesNotExist:
            # Create admin user if doesn't exist
            user = User.objects.create_superuser(
                username="admin",
                email="admin@edensglamp.com",
                password="admin123"
            )
        
        # Generate tokens
        access_token = AccessToken()
        access_token['username'] = user.username
        access_token['role'] = 'admin'
        access_token['user_id'] = user.id
        
        refresh_token = RefreshToken()
        refresh_token['username'] = user.username
        refresh_token['role'] = 'admin'
        refresh_token['user_id'] = user.id
        
        return Response(
            {
                "access": str(access_token),
                "refresh": str(refresh_token),
                "username": user.username,
                "email": user.email,
                "role": "admin",
            },
            status=status.HTTP_200_OK,
        )

    user = None
    
    # First, try to authenticate against Django's User model
    user = authenticate(username=identifier, password=password)

    # If failed, try email lookup in User model
    if not user:
        try:
            user_obj = User.objects.get(email=identifier)
            user = authenticate(
                username=user_obj.username,
                password=password
            )
        except User.DoesNotExist:
            user = None

    # If not found in User model, check the Staff model
    if not user:
        try:
            staff = Staff.objects.get(username=identifier)
            if staff.password and check_password(password, staff.password):
                # Staff authenticated successfully - create token manually
                # Create a custom token with staff info
                access_token = AccessToken()
                access_token['username'] = staff.username
                access_token['role'] = 'staff'
                access_token['user_id'] = staff.id
                
                refresh_token = RefreshToken()
                refresh_token['username'] = staff.username
                refresh_token['role'] = 'staff'
                refresh_token['user_id'] = staff.id
                
                return Response(
                    {
                        "access": str(access_token),
                        "refresh": str(refresh_token),
                        "username": staff.username,
                        "email": staff.email,
                        "role": "staff",
                    },
                    status=status.HTTP_200_OK,
                )
        except Staff.DoesNotExist:
            pass

    if not user:
        return Response(
            {"error": "Invalid username/email or password"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # Determine user role from profile
    role = "customer"
    if hasattr(user, 'profile') and user.profile.role:
        role = user.profile.role
    
    if user.is_superuser:
        role = "admin"
    elif user.is_staff:
        role = "staff"

    refresh = RefreshToken.for_user(user)

    return Response(
        {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "username": user.username,
            "email": user.email,
            "role": role,
            "user_id": user.id,
        },
        status=status.HTTP_200_OK,
    )


# =====================================================
# ADMIN LOGIN - Only allows admin users
# =====================================================
@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def admin_login(request):
    """
    Admin login - Only allows users with role='admin'
    """
    identifier = request.data.get("identifier")
    password = request.data.get("password")

    if not identifier or not password:
        return Response(
            {"error": "Username/email and password required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Special handling for admin credentials (admin/admin123)
    if identifier == "admin" and password == "admin123":
        try:
            user = User.objects.get(username="admin")
        except User.DoesNotExist:
            user = User.objects.create_superuser(
                username="admin",
                email="admin@edensglamp.com",
                password="admin123"
            )
        
        # Ensure profile has admin role
        if hasattr(user, 'profile'):
            user.profile.role = "admin"
            user.profile.save()
        else:
            UserProfile.objects.create(user=user, role="admin")
        
        access_token = AccessToken()
        access_token['username'] = user.username
        access_token['role'] = 'admin'
        access_token['user_id'] = user.id
        
        refresh_token = RefreshToken()
        refresh_token['username'] = user.username
        refresh_token['role'] = 'admin'
        refresh_token['user_id'] = user.id
        
        return Response(
            {
                "access": str(access_token),
                "refresh": str(refresh_token),
                "username": user.username,
                "email": user.email,
                "role": "admin",
            },
            status=status.HTTP_200_OK,
        )

    # Try to authenticate against Django's User model
    user = authenticate(username=identifier, password=password)

    # If failed, try email lookup
    if not user:
        try:
            user_obj = User.objects.get(email=identifier)
            user = authenticate(username=user_obj.username, password=password)
        except User.DoesNotExist:
            user = None

    if not user:
        return Response(
            {"error": "Invalid username/email or password"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # Check user role from profile
    user_role = "customer"
    if hasattr(user, 'profile'):
        user_role = user.profile.role
    
    # For superuser, always set as admin
    if user.is_superuser:
        user_role = "admin"

    # Only allow admin role for admin login
    if user_role != "admin":
        return Response(
            {"error": "Unauthorized Access. Only admin users can login here."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    refresh = RefreshToken.for_user(user)

    return Response(
        {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "username": user.username,
            "email": user.email,
            "role": "admin",
        },
        status=status.HTTP_200_OK,
    )


# =====================================================
# STAFF LOGIN - Only allows staff users
# =====================================================
@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def staff_login(request):
    """
    Staff login - Only allows users with role='staff'
    Also allows login via Staff model
    """
    identifier = request.data.get("identifier")
    password = request.data.get("password")

    if not identifier or not password:
        return Response(
            {"error": "Username and password required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = None
    
    # First, try to authenticate against Django's User model
    user = authenticate(username=identifier, password=password)

    # If failed, try email lookup
    if not user:
        try:
            user_obj = User.objects.get(email=identifier)
            user = authenticate(username=user_obj.username, password=password)
        except User.DoesNotExist:
            user = None

    # If not found in User model, check the Staff model
    if not user:
        try:
            staff = Staff.objects.get(username=identifier)
            if staff.password and check_password(password, staff.password):
                # Staff authenticated successfully
                access_token = AccessToken()
                access_token['username'] = staff.username
                access_token['role'] = 'staff'
                access_token['user_id'] = staff.id
                
                refresh_token = RefreshToken()
                refresh_token['username'] = staff.username
                refresh_token['role'] = 'staff'
                refresh_token['user_id'] = staff.id
                
                return Response(
                    {
                        "access": str(access_token),
                        "refresh": str(refresh_token),
                        "username": staff.username,
                        "email": staff.email,
                        "role": "staff",
                    },
                    status=status.HTTP_200_OK,
                )
        except Staff.DoesNotExist:
            pass

    if not user:
        return Response(
            {"error": "Invalid username or password"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # Check user role from profile
    user_role = "customer"
    if hasattr(user, 'profile'):
        user_role = user.profile.role
    
    # For staff flag, set as staff
    if user.is_staff:
        user_role = "staff"

    # Only allow staff role for staff login
    if user_role != "staff":
        return Response(
            {"error": "Unauthorized Access. Only staff users can login here."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    refresh = RefreshToken.for_user(user)

    return Response(
        {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "username": user.username,
            "email": user.email,
            "role": "staff",
        },
        status=status.HTTP_200_OK,
    )


# =====================================================
# CUSTOMER LOGIN - Only allows customer users
# =====================================================
@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def customer_login(request):
    """
    Customer login - Only allows users with role='customer'
    """
    identifier = str(request.data.get("identifier", "")).strip()
    password = request.data.get("password")

    if not identifier or not password:
        return Response(
            {"error": "Username/email and password required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Special admin credentials should not work for customer login
    if identifier == "admin" and password == "admin123":
        return Response(
            {"error": "Unauthorized Access. Please use admin login page."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # Try to authenticate against Django's User model
    user = authenticate(username=identifier, password=password)

    # If failed, try email lookup
    if not user:
        try:
            user_obj = User.objects.get(email__iexact=identifier)
            user = authenticate(username=user_obj.username, password=password)
        except User.DoesNotExist:
            user = None

    # Check Staff model - staff should not login as customer
    if not user:
        try:
            staff = Staff.objects.get(username=identifier)
            return Response(
                {"error": "Unauthorized Access. Please use staff login page."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except Staff.DoesNotExist:
            pass

    if not user:
        return Response(
            {"error": "Invalid username/email or password"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # Check user role from profile
    user_role = "customer"
    if hasattr(user, 'profile'):
        user_role = user.profile.role
    
    # For superuser or staff, deny customer login
    if user.is_superuser or user.is_staff:
        return Response(
            {"error": "Unauthorized Access. Please use appropriate login page."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # Only allow customer role for customer login
    if user_role not in ("customer", None, ""):
        return Response(
            {"error": "Unauthorized Access. Please use the correct login page for your role."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    refresh = RefreshToken.for_user(user)

    return Response(
        {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "username": user.username,
            "email": user.email,
            "role": "customer",
        },
        status=status.HTTP_200_OK,
    )


# =====================================================
# GOOGLE OAUTH LOGIN
# =====================================================

@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def google_login(request):
    """
    Login or register using Google OAuth token
    """
    token = request.data.get("token")
    
    if not token:
        return Response(
            {"error": "Google token is required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Verify the Google token
        google_client_id = getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', None)
        
        if not google_client_id:
            return Response(
                {"error": "Google OAuth not configured. Please add GOOGLE_OAUTH_CLIENT_ID to settings."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Verify token with Google
        verify_url = f"https://www.googleapis.com/oauth2/v3/tokeninfo?id_token={token}"
        response = requests.get(verify_url)
        
        if response.status_code != 200:
            return Response(
                {"error": "Invalid Google token"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        google_data = response.json()
        email = google_data.get("email")
        
        if not email:
            return Response(
                {"error": "Could not get email from Google"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Try to find existing user
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Create new user
            username = email.split("@")[0]
            # Make username unique
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
            
            user = User.objects.create_user(
                username=username,
                email=email,
                password=None  # No password for OAuth users
            )
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "username": user.username,
            "email": user.email,
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# =====================================================
# RESERVATIONS
# =====================================================

@api_view(["GET", "POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def list_reservations(request):
    if request.method == "GET":
        qs = Reservation.objects.all().order_by("-created_at")
        return Response(
            ReservationSerializer(qs, many=True).data
        )

    serializer = ReservationSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["GET", "PATCH", "PUT", "DELETE"])
@permission_classes([AllowAny])
@authentication_classes([])
def reservation_detail(request, pk):
    reservation = get_object_or_404(Reservation, pk=pk)

    if request.method == "GET":
        return Response(
            ReservationSerializer(reservation).data
        )

    if request.method in ("PATCH", "PUT"):
        old_status = reservation.status
        serializer = ReservationSerializer(
            reservation,
            data=request.data,
            partial=request.method == "PATCH",
        )
        if serializer.is_valid():
            serializer.save()
            # Send email if status changed to Confirmed
            new_status = serializer.instance.status
            if old_status != "Confirmed" and new_status == "Confirmed":
                send_confirmation_email(reservation)
            return Response(serializer.data)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    reservation.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


def send_confirmation_email(reservation):
    """Send confirmation email to customer when reservation is confirmed"""
    subject = f'Reservation Confirmed - Eden\'s Glamp Resort'
    message = f"""
Dear {reservation.name},

Your reservation has been confirmed!

Reservation Details:
- Booking ID: #{reservation.id}
- Check-in Date: {reservation.checkin}
- Check-out Date: {reservation.checkout}
- Room Type: {reservation.room_type}
- Number of Rooms: {reservation.rooms}
- Total Guests: {reservation.adults} adults, {reservation.children} children
- Total Amount: ₹{reservation.total_amount}

Thank you for choosing Eden's Glamp Resort. We look forward to welcoming you!

Best regards,
Eden's Glamp Resort Team
    """

    invoice_content = f"""
===========================================
      EDEN'S GLAMP RESORT
===========================================

      INVOICE / BOOKING CONFIRMATION
      Booking ID: #{reservation.id}
      Date: {timezone.now().strftime("%Y-%m-%d %H:%M:%S")}

----------------------------------------
      GUEST DETAILS
----------------------------------------
Name:     {reservation.name}
Email:    {reservation.email}
Phone:    {reservation.phone}

----------------------------------------
      BOOKING DETAILS
----------------------------------------
Check-in:  {reservation.checkin}
Check-out: {reservation.checkout}
Room Type: {reservation.room_type or "Standard"}
Rooms:     {reservation.rooms}
Guests:    {reservation.adults} Adult(s), {reservation.children} Child(ren)

----------------------------------------
      PAYMENT DETAILS
----------------------------------------
Total Amount: Rs. {reservation.total_amount}
Payment ID:   {reservation.payment_id or "N/A"}
Status:       {reservation.status}

===========================================
      Thank you for choosing Eden's Glamp!
===========================================
    """
    
    try:
        email = EmailMessage(
            subject=subject,
            body=message,
            from_email=settings.EMAIL_HOST_USER,
            to=[reservation.email],
        )
        email.attach(
            f"invoice_INV-{reservation.id:06d}.txt",
            invoice_content,
            "text/plain",
        )
        email.send(fail_silently=False)
        print(f"Confirmation email sent to {reservation.email}")
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        # Log the error but don't fail the reservation
        return False


@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def send_confirmation_email_view(request, reservation_id):
    """Send confirmation email for a specific reservation"""
    try:
        reservation = get_object_or_404(Reservation, pk=reservation_id)
        send_confirmation_email(reservation)
        return Response({"success": True, "message": f"Confirmation email sent to {reservation.email}"})
    except Exception as e:
        return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# =====================================================
# ROOMS
# =====================================================

@api_view(["GET", "POST"])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([AllowAny])
def rooms_view(request):
    if request.method == "GET":
        # Public default: only active rooms. Admin can pass ?include_inactive=1
        include_inactive = str(request.query_params.get("include_inactive", "")).lower() in {"1", "true", "yes"}
        rooms = Room.objects.all().order_by("-created_at") if include_inactive else Room.objects.filter(is_available=True).order_by("-created_at")
        return Response(
            RoomSerializer(
                rooms,
                many=True,
                context={"request": request},
            ).data
        )

    room_name = request.data.get("room_name")
    if not room_name:
        return Response(
            {"room_name": ["This field is required"]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    room = Room.objects.create(
        room_name=room_name,
        description=request.data.get("description", ""),
        price=request.data.get("price", 0),
        number_of_rooms=request.data.get("number_of_rooms", 1),
        capacity=request.data.get("capacity", 1),
    )

    for img in request.FILES.getlist("images[]"):
        RoomImage.objects.create(room=room, image=img)

    return Response(
        RoomSerializer(
            room,
            context={"request": request},
        ).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([AllowAny])
def room_detail(request, pk):
    room = get_object_or_404(Room, pk=pk)

    if request.method == "GET":
        return Response(
            RoomSerializer(
                room,
                context={"request": request},
            ).data
        )

    if request.method == "PATCH":
        data = request.data

        if "room_name" in data:
            room.room_name = data.get("room_name") or room.room_name
        if "description" in data:
            room.description = data.get("description", "")
        if "price" in data:
            try:
                room.price = data.get("price")
            except Exception:
                pass
        if "number_of_rooms" in data:
            try:
                room.number_of_rooms = int(data.get("number_of_rooms"))
            except Exception:
                pass
        if "capacity" in data:
            try:
                room.capacity = int(data.get("capacity"))
            except Exception:
                pass
        if "is_available" in data:
            val = data.get("is_available")
            if isinstance(val, bool):
                room.is_available = val
            else:
                room.is_available = str(val).lower() in {"1", "true", "yes", "on"}

        room.save()

        for img in request.FILES.getlist("images[]"):
            RoomImage.objects.create(room=room, image=img)

        return Response(
            RoomSerializer(room, context={"request": request}).data
        )

    # Hard delete (only if explicitly needed)
    for img in room.images.all():
        img.image.delete(save=False)
        img.delete()

    room.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# =====================================================
# STAFF
# =====================================================

@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def staff_list_create(request):
    if request.method == "GET":
        # Show all staff including those with resign_date (to see their history)
        staff = Staff.objects.all().order_by("-entry_date")
        return Response(
            StaffSerializer(staff, many=True).data
        )

    serializer = StaffSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["GET", "PATCH", "PUT", "DELETE"])
@permission_classes([AllowAny])
def staff_detail(request, pk):
    staff = get_object_or_404(Staff, pk=pk)

    if request.method == "GET":
        return Response(
            StaffSerializer(staff).data
        )

    if request.method in ("PATCH", "PUT"):
        serializer = StaffSerializer(
            staff,
            data=request.data,
            partial=request.method == "PATCH",
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    staff.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# =====================================================
# GALLERY
# =====================================================

@api_view(["GET", "POST"])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([AllowAny])
def gallery_list_create(request):
    if request.method == "GET":
        # Only show available images by default
        images = Gallery.objects.filter(is_available=True).order_by("-uploaded_at")
        return Response(
            GallerySerializer(
                images,
                many=True,
                context={"request": request},
            ).data
        )

    serializer = GallerySerializer(
        data=request.data,
        context={"request": request},
    )
    if serializer.is_valid():
        serializer.save()
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["PATCH", "DELETE"])
@permission_classes([AllowAny])
def gallery_delete(request, pk):
    img = get_object_or_404(Gallery, pk=pk)

    # Handle soft delete via PATCH - set is_available to False
    if request.method == "PATCH":
        img.is_available = False
        img.save()
        return Response({"success": True, "message": "Image removed successfully"})

    # Hard delete (only if explicitly needed)
    img.image.delete(save=False)
    img.delete()
    return Response({"success": True})


# =====================================================
# FOOD
# =====================================================

@api_view(["GET", "POST"])
@parser_classes([MultiPartParser, FormParser])
@permission_classes([AllowAny])
def food_list_create(request):
    if request.method == "GET":
        # Only show available foods by default
        foods = Food.objects.filter(is_available=True).order_by("-created_at")
        return Response(
            FoodSerializer(
                foods,
                many=True,
                context={"request": request},
            ).data
        )

    serializer = FoodSerializer(
        data=request.data,
        context={"request": request},
    )
    if serializer.is_valid():
        serializer.save()
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["PATCH", "DELETE"])
@permission_classes([AllowAny])
def food_delete(request, pk):
    food = get_object_or_404(Food, pk=pk)

    # Handle soft delete via PATCH - set is_available to False
    if request.method == "PATCH":
        food.is_available = False
        food.save()
        return Response({"success": True, "message": "Food item removed successfully"})

    # Hard delete (only if explicitly needed)
    if food.image:
        food.image.delete(save=False)

    food.delete()
    return Response({"success": True})


@api_view(["GET"])
def confirmed_guests(request):
    guests = Reservation.objects.filter(status="Confirmed")
    serializer = ReservationSerializer(guests, many=True)
    return Response(serializer.data)


from api.models import GuestActivity
import razorpay
from django.conf import settings

@api_view(["GET"])
def guest_activities(request, reservation_id):
    activities = GuestActivity.objects.filter(
        reservation_id=reservation_id
    ).order_by("-created_at")

    data = [
        {
            "type": a.activity_type,
            "description": a.description,
            "amount": a.amount,
            "date": a.created_at,
        }
        for a in activities
    ]

    return Response(data)


# =====================================================
# FOOD ORDERS
# =====================================================

@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def food_order_list_create(request):
    if request.method == "GET":
        orders = FoodOrder.objects.all().order_by("-created_at")
        serializer = FoodOrderSerializer(orders, many=True)
        return Response(serializer.data)

    serializer = FoodOrderCreateSerializer(data=request.data)
    if serializer.is_valid():
        # Calculate total price
        food = serializer.validated_data["food"]
        quantity = serializer.validated_data.get("quantity", 1)
        total_price = float(food.price) * quantity
        
        order = FoodOrder.objects.create(
            reservation=serializer.validated_data["reservation"],
            food=food,
            quantity=quantity,
            special_instructions=serializer.validated_data.get("special_instructions", ""),
            total_price=total_price,
            status="pending"
        )
        
        # Log activity
        try:
            GuestActivity.objects.create(
                reservation=serializer.validated_data["reservation"],
                activity_type="food",
                description=f"Ordered {food.name} (x{quantity})",
                amount=total_price,
            )
        except:
            pass
        
        return Response(
            FoodOrderSerializer(order).data,
            status=status.HTTP_201_CREATED,
        )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([AllowAny])
def food_order_detail(request, pk):
    order = get_object_or_404(FoodOrder, pk=pk)

    if request.method == "GET":
        return Response(FoodOrderSerializer(order).data)

    if request.method == "PATCH":
        serializer = FoodOrderSerializer(order, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == "DELETE":
        order.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([AllowAny])
def pending_food_orders(request):
    """Get all pending orders for staff"""
    orders = FoodOrder.objects.filter(status="pending").order_by("-created_at")
    serializer = FoodOrderSerializer(orders, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([AllowAny])
def food_orders_by_month(request, year, month):
    """Get all food orders for a specific month (admin history)"""
    orders = FoodOrder.objects.filter(
        created_at__year=year,
        created_at__month=month
    ).order_by("-created_at")
    serializer = FoodOrderSerializer(orders, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([AllowAny])
def food_order_months_with_orders(request):
    """Get list of months that have orders (for admin filtering)"""
    from django.db.models.functions import ExtractMonth, ExtractYear
    from django.db.models import Count
    
    orders = FoodOrder.objects.annotate(
        month=ExtractMonth("created_at"),
        year=ExtractYear("created_at")
    ).values("year", "month").annotate(
        count=Count("id")
    ).order_by("-year", "-month")
    
    return Response(list(orders))


@api_view(["GET"])
@permission_classes([AllowAny])
def food_order_stats(request):
    """Get food order statistics for admin dashboard"""
    from django.db.models import Sum
    from django.utils import timezone
    from datetime import timedelta
    
    today = timezone.now().date()
    
    # Today's orders
    today_orders = FoodOrder.objects.filter(created_at__date=today)
    today_revenue = today_orders.aggregate(total=Sum("total_price"))["total"] or 0
    today_count = today_orders.count()
    
    # This month's orders
    month_orders = FoodOrder.objects.filter(
        created_at__year=today.year,
        created_at__month=today.month
    )
    month_revenue = month_orders.aggregate(total=Sum("total_price"))["total"] or 0
    month_count = month_orders.count()
    
    # Pending orders
    pending_count = FoodOrder.objects.filter(status="pending").count()
    
    return Response({
        "today_revenue": float(today_revenue),
        "today_count": today_count,
        "month_revenue": float(month_revenue),
        "month_count": month_count,
        "pending_count": pending_count,
    })


# =====================================================
# RAZORPAY PAYMENT
# =====================================================

# Initialize Razorpay client
razorpay_client = razorpay.Client(
    auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
)


# =====================================================
# CHECK ROOM AVAILABILITY
# =====================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def check_room_availability(request):
    """
    Check room availability for given dates
    """
    room_type = request.query_params.get("room_type")
    check_in = request.query_params.get("check_in")
    check_out = request.query_params.get("check_out")
    
    if not all([room_type, check_in, check_out]):
        return Response(
            {"error": "room_type, check_in, and check_out are required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        room = Room.objects.get(room_name=room_type)
        total_rooms = room.number_of_rooms
        
        check_in_date = datetime.datetime.strptime(check_in, "%Y-%m-%d").date()
        check_out_date = datetime.datetime.strptime(check_out, "%Y-%m-%d").date()
        
        unavailable_dates = []
        available_rooms_info = []
        closed_dates = set(
            RoomPrice.objects.filter(
                room=room,
                date__gte=check_in_date,
                date__lt=check_out_date,
                is_closed=True,
            ).values_list("date", flat=True)
        )
        
        current_date = check_in_date
        while current_date < check_out_date:
            if current_date in closed_dates:
                unavailable_dates.append(current_date.strftime("%Y-%m-%d"))
                available_rooms_info.append({
                    "date": current_date.strftime("%Y-%m-%d"),
                    "available": 0,
                    "total": total_rooms,
                    "is_closed": True,
                })
                current_date += timedelta(days=1)
                continue

            booked_rooms = Reservation.objects.filter(
                room_type=room_type,
                status__in=["Confirmed", "Pending", "Checked-In"],
                checkin__lte=current_date,
                checkout__gt=current_date
            ).aggregate(total=Sum("rooms"))["total"] or 0
            
            available = total_rooms - booked_rooms
            
            if available == 0:
                unavailable_dates.append(current_date.strftime("%Y-%m-%d"))
            
            available_rooms_info.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "available": available,
                "total": total_rooms,
                "is_closed": False,
            })
            
            current_date += timedelta(days=1)
        
        return Response({
            "room_type": room_type,
            "total_rooms": total_rooms,
            "unavailable_dates": unavailable_dates,
            "dates_info": available_rooms_info,
            "is_available": len(unavailable_dates) == 0
        })
        
    except Room.DoesNotExist:
        return Response(
            {"error": "Room type not found"},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def create_payment_order(request):
    """
    Create a Razorpay payment order for room booking
    """
    amount = request.data.get("amount")
    
    if not amount:
        return Response(
            {"error": "Amount is required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Convert amount to paise (Razorpay expects amount in paise)
    amount_paise = int(float(amount) * 100)
    
    # Create order
    order_data = {
        "amount": amount_paise,
        "currency": "INR",
        "payment_capture": "1"
    }
    
    try:
        order = razorpay_client.order.create(data=order_data)
        return Response({
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"],
            "key_id": settings.RAZORPAY_KEY_ID
        })
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_payment(request):
    """
    Verify Razorpay payment and create reservation
    """
    razorpay_order_id = request.data.get("razorpay_order_id")
    razorpay_payment_id = request.data.get("razorpay_payment_id")
    razorpay_signature = request.data.get("razorpay_signature")
    
    # Reservation data
    reservation_data = request.data.get("reservation", {})
    
    if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
        return Response(
            {"error": "Payment verification details are required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check room availability before processing payment
    check_in = reservation_data.get("check_in")
    check_out = reservation_data.get("check_out")
    room_type = reservation_data.get("room_type", "")
    requested_rooms = int(reservation_data.get("rooms", 1))
    
    if check_in and check_out and room_type:
        # Get the room to find total available rooms
        try:
            room = Room.objects.get(room_name=room_type)
            total_rooms = room.number_of_rooms
            
            # Parse dates
            check_in_date = datetime.datetime.strptime(check_in, "%Y-%m-%d").date()
            check_out_date = datetime.datetime.strptime(check_out, "%Y-%m-%d").date()
            
            # Check availability for each date in the range
            closed_dates = set(
                RoomPrice.objects.filter(
                    room=room,
                    date__gte=check_in_date,
                    date__lt=check_out_date,
                    is_closed=True,
                ).values_list("date", flat=True)
            )
            current_date = check_in_date
            while current_date < check_out_date:
                if current_date in closed_dates:
                    return Response(
                        {"error": f"Booking is closed for {current_date.strftime('%Y-%m-%d')} for this room."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Count confirmed reservations for this date
                booked_rooms = Reservation.objects.filter(
                    room_type=room_type,
                    status__in=["Confirmed", "Pending", "Checked-In"],
                    checkin__lte=current_date,
                    checkout__gt=current_date
                ).aggregate(total=Sum("rooms"))["total"] or 0
                
                available_rooms = total_rooms - booked_rooms
                
                if available_rooms < requested_rooms:
                    return Response(
                        {"error": f"No rooms available for {current_date.strftime('%Y-%m-%d')}. Only {available_rooms} room(s) available out of {total_rooms}. Please choose different dates or reduce the number of rooms."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                current_date += datetime.timedelta(days=1)
                
        except Room.DoesNotExist:
            pass  # If room doesn't exist, proceed without availability check
    
    # Verify signature
    try:
        params_dict = {
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_signature": razorpay_signature
        }
        razorpay_client.utility.verify_payment_signature(params_dict)
    except razorpay.errors.SignatureVerificationError:
        return Response(
            {"error": "Payment verification failed"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Create reservation after successful payment
    serializer = ReservationSerializer(data=reservation_data)
    if serializer.is_valid():
        reservation = serializer.save()
        reservation.payment_id = razorpay_payment_id
        reservation.payment_status = "paid"
        reservation.status = "Confirmed"
        reservation.save()
        
        # Send confirmation email (don't fail reservation if email fails)
        try:
            send_confirmation_email(reservation)
        except Exception as email_error:
            print(f"Email sending failed but reservation created: {email_error}")
        
        return Response({
            "message": "Payment successful and reservation created",
            "reservation": ReservationSerializer(reservation).data
        })
    
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )


# =====================================================
# ADMIN - CUSTOMERS LIST
# =====================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def list_customers(request):
    """
    List all registered customers (users with profiles)
    """
    users = User.objects.select_related('profile').order_by('-date_joined')
    
    customers = []
    for user in users:
        profile = getattr(user, 'profile', None)
        customers.append({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "phone": profile.phone if profile else "",
            "address": profile.address if profile else "",
            "date_joined": user.date_joined.isoformat() if user.date_joined else None,
        })
    
    return Response(customers)


# =====================================================
# ADMIN - ROOM PRICING
# =====================================================

@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def room_prices(request, room_id):
    """
    Get or set custom prices for a room
    GET: Returns all custom prices for a room
    POST: Create/update a custom price for a specific date
    """
    if request.method == "GET":
        year = request.query_params.get("year")
        month = request.query_params.get("month")
        
        prices = RoomPrice.objects.filter(room_id=room_id)
        
        if year and month:
            prices = prices.filter(date__year=int(year), date__month=int(month))
        
        data = [
            {
                "id": p.id,
                "date": p.date.isoformat(),
                "price": str(p.price),
                "is_special": p.is_special,
                "is_closed": p.is_closed,
            }
            for p in prices
        ]
        return Response(data)
    
    # POST - Create or update price
    date_str = request.data.get("date")
    price = request.data.get("price")
    is_special = request.data.get("is_special", False)
    is_closed = request.data.get("is_closed", False)
    if not isinstance(is_special, bool):
        is_special = str(is_special).lower() in {"1", "true", "yes", "on"}
    if not isinstance(is_closed, bool):
        is_closed = str(is_closed).lower() in {"1", "true", "yes", "on"}
    
    if not date_str:
        return Response(
            {"error": "Date is required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        room = Room.objects.get(id=room_id)
    except Room.DoesNotExist:
        return Response(
            {"error": "Room not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if not price:
        price = room.price

    # Check if price already exists for this date
    price_obj, created = RoomPrice.objects.update_or_create(
        room=room,
        date=date_str,
        defaults={
            "price": price,
            "is_special": is_special,
            "is_closed": is_closed,
        }
    )
    
    return Response({
        "id": price_obj.id,
        "date": price_obj.date.isoformat(),
        "price": str(price_obj.price),
        "is_special": price_obj.is_special,
        "is_closed": price_obj.is_closed,
        "message": "Price updated successfully" if not created else "Price created successfully"
    })


@api_view(["DELETE"])
@permission_classes([AllowAny])
def delete_room_price(request, price_id):
    """Delete a custom room price"""
    try:
        price = RoomPrice.objects.get(id=price_id)
        price.delete()
        return Response({"message": "Price deleted successfully"})
    except RoomPrice.DoesNotExist:
        return Response(
            {"error": "Price not found"},
            status=status.HTTP_404_NOT_FOUND
        )
