# backend/api/admin.py
from django.contrib import admin

from .models import (
    Reservation,
    Room,
    RoomImage,
    Staff,
    Gallery,
    Food,
    UserProfile,
)

# ------------------------
# Reservation Admin
# ------------------------
@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "email",
        "phone",
        "checkin",
        "checkout",
        "status",
        "created_at",
    )
    list_filter = ("status", "checkin", "checkout")
    search_fields = ("name", "email", "phone")


# ------------------------
# Simple registrations
# ------------------------
admin.site.register(Room)
admin.site.register(RoomImage)
admin.site.register(Staff)
admin.site.register(Gallery)
admin.site.register(Food)
admin.site.register(UserProfile)
