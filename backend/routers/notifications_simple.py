from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models
from database import get_db
from auth import get_current_active_user

router = APIRouter(
    tags=["notifications"]
)

@router.get("/")
async def get_notifications():
    """Kullanıcının bildirimlerini getir - AUTH YOK"""
    return []

@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """VAPID public key döndür"""
    return {"publicKey": "BLBz4TKkKHRLdLJ36UNT7_eLJHLEBB1CPxNn3R1MytaR9jdJvEcTNWHo7qV_sIHYdBK7-xF4Wp9c7yJKPsOI9LA"}

@router.get("/settings")
async def get_notification_settings():
    """Bildirim ayarlarını getir - AUTH YOK"""
    return {
        "id": 1,
        "user_id": 1,
        "email_notifications": True,
        "browser_notifications": True,
        "notify_ticket_created": True,
        "notify_ticket_updated": True,
        "notify_ticket_assigned": True
    }
