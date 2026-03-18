from django.urls import path
from . import views


urlpatterns = [
    # -------------------------
    # Auth
    # -------------------------
    path("auth/register/", views.register_user, name="auth-register"),
    path("auth/login/", views.login_user, name="auth-login"),
    
    # Separate role-based login endpoints
    path("auth/admin/login/", views.admin_login, name="auth-admin-login"),
    path("auth/staff/login/", views.staff_login, name="auth-staff-login"),
    path("auth/customer/login/", views.customer_login, name="auth-customer-login"),
    
    path("auth/google/", views.google_login, name="auth-google"),

    # -------------------------
    # User Profile & Invoices
    # -------------------------
    path("user/reservations/", views.user_reservations, name="user-reservations"),
    path("invoices/<int:reservation_id>/download/", views.download_invoice, name="download-invoice"),

    # -------------------------
    # Rooms
    # -------------------------
    path("rooms/", views.rooms_view, name="rooms-list-create"),
    path("rooms/<int:pk>/", views.room_detail, name="room-detail"),
    path("rooms/availability/", views.check_room_availability, name="check-room-availability"),

    # -------------------------
    # Reservations
    # -------------------------
    path("reservations/", views.list_reservations, name="reservations-list"),
    path("reservations/<int:pk>/", views.reservation_detail, name="reservations-detail"),
    path("reservations/<int:reservation_id>/send-confirmation/", views.send_confirmation_email_view, name="send-confirmation-email"),

    # -------------------------
    # Staff
    # -------------------------
    path("staff/", views.staff_list_create, name="staff-list-create"),
    path("staff/<int:pk>/", views.staff_detail, name="staff-detail"),

    # -------------------------
    # Gallery
    # -------------------------
    path("gallery/", views.gallery_list_create, name="gallery-list-create"),
    path("gallery/<int:pk>/delete/", views.gallery_delete, name="gallery-delete"),

    # -------------------------
    # Food
    # -------------------------
    path("food/", views.food_list_create, name="food-list-create"),
    path("food/<int:pk>/delete/", views.food_delete, name="food-delete"),

    # Food Orders
    path("food-orders/", views.food_order_list_create, name="food-orders-list"),
    path("food-orders/<int:pk>/", views.food_order_detail, name="food-order-detail"),
    path("food-orders/pending/", views.pending_food_orders, name="pending-food-orders"),
    path("food-orders/stats/", views.food_order_stats, name="food-order-stats"),
    path("food-orders/months/", views.food_order_months_with_orders, name="food-order-months"),
    path("food-orders/history/<int:year>/<int:month>/", views.food_orders_by_month, name="food-orders-by-month"),

    path("admin/confirmed-guests/", views.confirmed_guests),

    path(
        "admin/guest/<int:reservation_id>/activities/",
        views.guest_activities
    ),

    # -------------------------
    # Razorpay Payment
    # -------------------------
    path("payment/create-order/", views.create_payment_order, name="create-payment-order"),
    path("payment/verify/", views.verify_payment, name="verify-payment"),

    # -------------------------
    # Reviews
    # -------------------------
    path("reviews/", views.review_list_create, name="review-list-create"),
    path("reviews/<int:pk>/", views.review_detail, name="review-detail"),
    path("reviews/reservation/<int:reservation_id>/", views.review_by_reservation, name="review-by-reservation"),
    path("reviews/eligible/", views.get_eligible_reservations_for_review, name="eligible-reservations"),
    path("reviews/stats/", views.review_stats, name="review-stats"),

    # -------------------------
    # Customers
    # -------------------------
    path("admin/customers/", views.list_customers, name="list-customers"),

    # -------------------------
    # Room Pricing
    # -------------------------
    path("admin/rooms/<int:room_id>/prices/", views.room_prices, name="room-prices"),
    path("admin/prices/<int:price_id>/", views.delete_room_price, name="delete-room-price"),

]
