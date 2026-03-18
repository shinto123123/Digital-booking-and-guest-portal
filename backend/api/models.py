from django.db import models
from django.contrib.auth.models import User


# ------------------------
# Reservation
# ------------------------
class Reservation(models.Model):
    STATUS_PENDING = "Pending"
    STATUS_CONFIRMED = "Confirmed"
    STATUS_CANCELLED = "Cancelled"
    STATUS_CHECKED_IN = "Checked-In"
    STATUS_CHECKED_OUT = "Checked-Out"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_CONFIRMED, "Confirmed"),
        (STATUS_CANCELLED, "Cancelled"),
        (STATUS_CHECKED_IN, "Checked-In"),
        (STATUS_CHECKED_OUT, "Checked-Out"),
    ]

    # (Optional but recommended later)
    # user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    name = models.CharField(max_length=200)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)

    adults = models.PositiveIntegerField(default=1)
    children = models.PositiveIntegerField(default=0)

    checkin = models.DateField()
    checkout = models.DateField()

    room_type = models.CharField(max_length=100, blank=True, default="")
    rooms = models.PositiveIntegerField(default=1)

    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=16,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )
    
    # Payment fields for Razorpay
    payment_id = models.CharField(max_length=100, blank=True, default="")
    payment_status = models.CharField(max_length=20, blank=True, default="")
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Booking by {self.name}"


# ------------------------
# Room
# ------------------------
class Room(models.Model):
    room_name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    number_of_rooms = models.PositiveIntegerField(default=1)
    capacity = models.PositiveIntegerField(default=1)
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.room_name


class RoomImage(models.Model):
    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name="images",
    )
    image = models.ImageField(upload_to="room_images/")

    def __str__(self):
        return f"{self.room.room_name} Image"


# ------------------------
# Room Price (Custom pricing for specific dates)
# ------------------------
class RoomPrice(models.Model):
    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name="custom_prices"
    )
    date = models.DateField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_special = models.BooleanField(default=False, help_text="Mark as special/peak pricing")
    is_closed = models.BooleanField(default=False, help_text="If true, booking is closed for this room/date")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['room', 'date']
        ordering = ['date']

    def __str__(self):
        return f"{self.room.room_name} - {self.date}: ₹{self.price}"


# ------------------------
# Staff
# ------------------------
class Staff(models.Model):
    username = models.CharField(max_length=150, unique=True)
    password = models.CharField(max_length=255)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    address = models.TextField(blank=True)

    entry_date = models.DateField(auto_now_add=True)
    resign_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.username


# ------------------------
# Gallery
# ------------------------
class Gallery(models.Model):
    image = models.ImageField(upload_to="gallery/")
    is_available = models.BooleanField(default=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Gallery Image {self.id}"


# ------------------------
# Food
# ------------------------
class Food(models.Model):
    CATEGORY_CHOICES = [
        ("bread", "Bread"),
        ("drinks", "Drinks"),
        ("veg", "Veg"),
        ("non-veg", "Non Veg"),
        ("dessert", "Dessert"),
    ]

    name = models.CharField(max_length=150)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    image = models.ImageField(upload_to="food/")
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


# ------------------------
# Food Order
# ------------------------
class FoodOrder(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("preparing", "Preparing"),
        ("ready", "Ready"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
    ]

    reservation = models.ForeignKey(
        Reservation,
        on_delete=models.CASCADE,
        related_name="food_orders"
    )
    food = models.ForeignKey(
        Food,
        on_delete=models.CASCADE,
        related_name="orders"
    )
    quantity = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    special_instructions = models.TextField(blank=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order #{self.id} - {self.food.name} ({self.reservation.name})"


# ------------------------
# User Profile (Option 2 ✅)
# ------------------------
class UserProfile(models.Model):
    ROLE_CHOICES = [
        ("admin", "Admin"),
        ("staff", "Staff"),
        ("customer", "Customer"),
    ]
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile"
    )
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="customer"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.role}"

# ------------------------
# Guest Activity
# ------------------------
class GuestActivity(models.Model):
    ACTIVITY_CHOICES = [
        ("food", "Food Order"),
        ("cab", "Cab Booking"),
        ("other", "Other"),
    ]

    reservation = models.ForeignKey(
        Reservation,
        on_delete=models.CASCADE,
        related_name="activities"
    )

    activity_type = models.CharField(
        max_length=20,
        choices=ACTIVITY_CHOICES
    )

    description = models.TextField()
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.activity_type} - {self.reservation.name}"


# ------------------------
# Review
# ------------------------
class Review(models.Model):
    reservation = models.ForeignKey(
        Reservation,
        on_delete=models.CASCADE,
        related_name="reviews"
    )
    rating = models.PositiveIntegerField(choices=[(i, i) for i in range(1, 6)])  # 1-5 stars
    review_text = models.TextField()
    admin_reply = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Review by {self.reservation.name} - {self.rating} stars"
