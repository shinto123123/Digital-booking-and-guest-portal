# backend/api/serializers.py

from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User   # ✅ ADD THIS

from api.models import (
    Reservation,
    Room,
    RoomImage,
    Staff,
    Gallery,
    Food,
    FoodOrder,
    Review,
)

# ------------------------
# Reservation
# ------------------------
class ReservationSerializer(serializers.ModelSerializer):
    check_in = serializers.DateField(source="checkin")
    check_out = serializers.DateField(source="checkout")
    message = serializers.CharField(source="notes", allow_blank=True)

    class Meta:
        model = Reservation
        fields = [
            "id",
            "name",
            "email",
            "phone",
            "adults",
            "children",
            "check_in",
            "check_out",
            "room_type",
            "rooms",
            "message",
            "status",
            "payment_id",
            "payment_status",
            "total_amount",
            "created_at",
        ]
        read_only_fields = ["created_at"]


# ------------------------
# Rooms
# ------------------------
class RoomImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomImage
        fields = ["id", "image"]


class RoomSerializer(serializers.ModelSerializer):
    images = RoomImageSerializer(many=True, read_only=True)

    class Meta:
        model = Room
        fields = [
            "id",
            "room_name",
            "description",
            "price",
            "number_of_rooms",
            "capacity",
            "is_available",
            "images",
            "created_at",
        ]


# ------------------------
# Staff
# ------------------------
class StaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = Staff
        fields = [
            "id",
            "username",
            "password",
            "email",
            "phone",
            "address",
            "entry_date",
            "resign_date",
        ]
        read_only_fields = ["id", "entry_date"]

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep.pop("password", None)
        return rep

    def create(self, validated_data):
        validated_data["password"] = make_password(validated_data["password"])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "password" in validated_data:
            validated_data["password"] = make_password(validated_data["password"])
        return super().update(instance, validated_data)


# ------------------------
# Gallery
# ------------------------
class GallerySerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Gallery
        fields = ["id", "image", "image_url", "uploaded_at"]

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


# ------------------------
# Food
# ------------------------
class FoodSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Food
        fields = [
            "id",
            "name",
            "category",
            "price",
            "image",
            "image_url",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "image_url"]

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


# ======================================================
# ✅ NEW: USER REGISTRATION SERIALIZER
# ======================================================
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["username", "email", "password"]

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )


# ======================================================
# FOOD ORDER SERIALIZER
# ======================================================
class FoodOrderSerializer(serializers.ModelSerializer):
    food_name = serializers.CharField(source="food.name", read_only=True)
    food_price = serializers.DecimalField(source="food.price", max_digits=8, decimal_places=2, read_only=True)
    guest_name = serializers.CharField(source="reservation.name", read_only=True)
    guest_phone = serializers.CharField(source="reservation.phone", read_only=True)
    room_info = serializers.CharField(source="reservation.room_type", read_only=True)
    
    class Meta:
        model = FoodOrder
        fields = [
            "id",
            "reservation",
            "food",
            "food_name",
            "food_price",
            "guest_name",
            "guest_phone",
            "room_info",
            "quantity",
            "status",
            "special_instructions",
            "total_price",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "total_price"]


class FoodOrderCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodOrder
        fields = [
            "reservation",
            "food",
            "quantity",
            "special_instructions",
        ]

    def create(self, validated_data):
        food = validated_data["food"]
        quantity = validated_data.get("quantity", 1)
        validated_data["total_price"] = food.price * quantity
        return super().create(validated_data)


# ======================================================
# REVIEW SERIALIZER
# ======================================================
class ReviewSerializer(serializers.ModelSerializer):
    guest_name = serializers.CharField(source="reservation.name", read_only=True)
    guest_email = serializers.CharField(source="reservation.email", read_only=True)
    room_type = serializers.CharField(source="reservation.room_type", read_only=True)
    check_out = serializers.DateField(source="reservation.checkout", read_only=True)
    
    class Meta:
        model = Review
        fields = [
            "id",
            "reservation",
            "guest_name",
            "guest_email",
            "room_type",
            "check_out",
            "rating",
            "review_text",
            "admin_reply",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "admin_reply"]


class ReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = [
            "reservation",
            "rating",
            "review_text",
        ]
