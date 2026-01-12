from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional, Union, Any, Dict, ForwardRef
from datetime import datetime
from enum import Enum

# İleriye dönük referans tanımı
UserRef = ForwardRef('User')

# Login şeması - LDAP özelliği eklendi
class Login(BaseModel):
    username: str
    password: str
    ldap: bool = False  # LDAP kimlik doğrulama için bayrak

# Base şema modelleri
class UserBase(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: str
    is_active: bool = True
    is_admin: bool = False
    is_ldap: bool = False

class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None
    manager_id: Optional[int] = None

class TicketBase(BaseModel):
    title: str
    description: str
    status: str = "open"  # 'open', 'in_progress', 'closed'
    priority: str = "medium"  # 'low', 'medium', 'high', 'critical'
    is_private: bool = False
    assignee_id: Optional[int] = None
    teos_id: Optional[str] = None
    citizenship_no: Optional[str] = None

class CommentBase(BaseModel):
    content: str

class AttachmentBase(BaseModel):
    filename: str
    file_size: int
    content_type: str

# Create modellerini kurmak
class UserCreate(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    is_admin: bool = False
    is_ldap: bool = False
    department_ids: Optional[List[int]] = None

class DepartmentCreate(DepartmentBase):
    pass

class TicketCreate(TicketBase):
    department_id: int

class CommentCreate(CommentBase):
    pass

class AttachmentCreate(AttachmentBase):
    pass

# İlişkisel modeller için Update modelleri
class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    department_ids: Optional[List[int]] = None
    browser_notification_token: Optional[str] = None

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    manager_id: Optional[int] = None

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    department_id: Optional[int] = None
    assignee_id: Optional[int] = None
    is_private: Optional[bool] = None
    teos_id: Optional[str] = None
    citizenship_no: Optional[str] = None

# Ticket paylaşım şeması
class TicketShare(BaseModel):
    user_ids: Optional[List[int]] = []
    department_ids: Optional[List[int]] = []

# Return modellerini kurmak
class UserInDB(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        orm_mode = True

class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    is_active: bool
    is_admin: bool
    is_ldap: bool
    department_id: Optional[int] = None
    departments: List[dict] = []
    created_at: datetime
    browser_notification_token: Optional[str] = None
    
    class Config:
        orm_mode = True
        
    @classmethod
    def from_user(cls, user):
        """User modelinden UserResponse oluştur"""
        return cls(
            id=user.id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_admin=user.is_admin,
            is_ldap=user.is_ldap,
            department_id=user.department_id,
            departments=[],  # Boş liste döndür, gerekirse ayrı endpoint'den al
            created_at=user.created_at,
            browser_notification_token=None
        )

# User alias tanımı ileriye dönük referanslar için
User = UserResponse

class Department(DepartmentBase):
    id: int
    manager_id: Optional[int] = None
    created_at: datetime
    
    class Config:
        orm_mode = True

# Alias for backward compatibility
DepartmentResponse = Department

class Comment(CommentBase):
    id: int
    user_id: int
    ticket_id: int
    created_at: datetime
    user: Optional[UserResponse] = None

    class Config:
        orm_mode = True

class Attachment(AttachmentBase):
    id: int
    ticket_id: int
    uploaded_by: int
    file_path: str
    created_at: datetime
    
    class Config:
        orm_mode = True

class Ticket(TicketBase):
    id: int
    creator_id: int
    department_id: int
    assignee_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    
    # İlişkileri düzgün şekilde dahil etmek için 
    creator: Optional[UserResponse] = None
    department: Optional[Department] = None 
    assignee: Optional[UserResponse] = None
    comments: List[Comment] = []
    attachments: List[Attachment] = []
    is_personal: Optional[bool] = None  # Kişisel mi departman mı?

    class Config:
        orm_mode = True
    
    @classmethod
    def from_ticket(cls, ticket):
        """Ticket modelinden Ticket schema oluştur"""
        return cls(
            id=ticket.id,
            title=ticket.title,
            description=ticket.description,
            status=ticket.status,
            priority=ticket.priority,
            is_private=ticket.is_private,
            visibility_level=ticket.visibility_level,
            teos_id=getattr(ticket, 'teos_id', None),
            citizenship_no=getattr(ticket, 'citizenship_no', None),
            creator_id=ticket.creator_id,
            department_id=ticket.department_id,
            assignee_id=ticket.assignee_id,
            created_at=ticket.created_at,
            updated_at=ticket.updated_at,
            closed_at=getattr(ticket, 'closed_at', None),
            creator=UserResponse.from_user(ticket.creator) if ticket.creator else None,
            department={
                "id": ticket.department.id,
                "name": ticket.department.name,
                "description": ticket.department.description,
                "created_at": ticket.department.created_at
            } if ticket.department else None,
            assignee=UserResponse.from_user(ticket.assignee) if ticket.assignee else None,
            comments=[],
            attachments=[],
            is_personal=getattr(ticket, 'is_personal', ticket.assignee_id is not None)
        )
        # Pydantic'e ilişkileri dahil etmesi için güncelle
        json_schema_extra = {
            "example": {
                "id": 1,
                "title": "Örnek Talep",
                "description": "Bu bir örnek taleptir",
                "status": "open",
                "priority": "medium",
                "is_private": False,
                "is_personal": False,
                "creator": {"id": 1, "username": "admin", "full_name": "Sistem Yöneticisi"},
                "department": {"id": 1, "name": "Genel"},
                "assignee": {"id": 2, "username": "user1", "full_name": "Test Kullanıcı"}
            }
        }

# Wiki modelleri için şemalar - Döngüsel bağımlılıktan kaçınmak için basitleştirildi
class WikiRevisionBase(BaseModel):
    content: str

class WikiRevisionCreate(WikiRevisionBase):
    pass

class WikiBase(BaseModel):
    title: str
    is_private: bool = False
    department_id: Optional[int] = None

class WikiCreate(WikiBase):
    content: str  # İlk revizyon içeriği

# Wiki paylaşım şeması
class WikiShare(BaseModel):
    user_ids: Optional[List[int]] = []
    department_ids: Optional[List[int]] = []

class WikiRevision(WikiRevisionBase):
    id: int
    wiki_id: int
    creator_id: int
    created_at: datetime

    class Config:
        orm_mode = True

class Wiki(WikiBase):
    id: int
    slug: str
    creator_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True

class WikiDetail(Wiki):
    revisions: List[WikiRevision] = []
    
    class Config:
        orm_mode = True

# Token modellerini kurmak
class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    username: Optional[str] = None

# Sistem yapılandırma modeli
class TicketFieldConfig(BaseModel):
    enable_teos_id: bool = False
    enable_citizenship_no: bool = False
    require_teos_id: bool = False
    require_citizenship_no: bool = False

# Bildirim modelleri
class NotificationTypeEnum(str, Enum):
    TICKET_CREATED = "ticket_created"
    TICKET_UPDATED = "ticket_updated"
    TICKET_ASSIGNED = "ticket_assigned"
    TICKET_COMMENTED = "ticket_commented"
    WIKI_CREATED = "wiki_created"
    WIKI_UPDATED = "wiki_updated"
    WIKI_SHARED = "wiki_shared"

class NotificationBase(BaseModel):
    type: NotificationTypeEnum
    title: str
    message: str
    related_id: int

class NotificationCreate(NotificationBase):
    user_id: int

class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None

class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    is_read: bool
    created_at: datetime
    
    class Config:
        orm_mode = True

class NotificationSettingsBase(BaseModel):
    email_notifications: bool = True
    browser_notifications: bool = True
    ticket_assigned: bool = True
    ticket_updated: bool = True
    ticket_commented: bool = True
    ticket_attachment: bool = True

class NotificationSettingsCreate(NotificationSettingsBase):
    user_id: int

class NotificationSettingsUpdate(NotificationSettingsBase):
    pass

class NotificationSettingsResponse(NotificationSettingsBase):
    id: int
    user_id: int
    
    class Config:
        orm_mode = True

# E-posta yapılandırma şemaları
class EmailConfigBase(BaseModel):
    smtp_server: str
    smtp_port: int
    smtp_username: str
    smtp_password: str
    smtp_use_tls: bool = True
    from_email: EmailStr
    from_name: str = "Destek Sistemi"

class EmailConfigCreate(EmailConfigBase):
    pass

class EmailConfigUpdate(BaseModel):
    smtp_server: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: Optional[bool] = None
    from_email: Optional[EmailStr] = None
    from_name: Optional[str] = None

class EmailConfigResponse(EmailConfigBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

class TestEmailRequest(BaseModel):
    recipient_email: EmailStr



# Bildirim yapılandırma şemaları
class NotificationConfigBase(BaseModel):
    enable_email_notifications: bool = True
    enable_browser_notifications: bool = True
    notify_admin_on_new_ticket: bool = True
    notify_department_on_new_ticket: bool = True
    notify_creator_on_ticket_update: bool = True
    notify_assignee_on_ticket_update: bool = True
    email_notification_template: Optional[str] = None

class NotificationConfigCreate(NotificationConfigBase):
    pass

class NotificationConfigUpdate(NotificationConfigBase):
    pass

class NotificationConfigResponse(NotificationConfigBase):
    id: int
    updated_at: datetime
    
    class Config:
        orm_mode = True

# Kullanıcı giriş logu şemaları
class UserLoginLogBase(BaseModel):
    user_id: int
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    device_info: Optional[str] = None
    login_status: bool = True

class UserLoginLogCreate(UserLoginLogBase):
    pass

class UserLoginLogResponse(UserLoginLogBase):
    id: int
    login_time: datetime
    user: Optional[UserResponse] = None
    
    class Config:
        orm_mode = True

# GeneralConfig schemas - Sistem ayarları
class GeneralConfigBase(BaseModel):
    app_name: str = "Destek Sistemi"
    app_version: str = "1.0.0"
    maintenance_mode: bool = False
    maintenance_message: str = "Sistem bakım modunda."
    max_file_size_mb: int = 10
    allowed_file_types: str = "pdf,doc,docx,txt,jpg,jpeg,png,gif"
    email_notifications_enabled: bool = True
    default_department_id: Optional[int] = None
    smtp_server: Optional[str] = None
    smtp_port: int = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    upload_directory: str = "/app/uploads"
    ldap_enabled: bool = False
    ldap_server: Optional[str] = None
    ldap_port: int = 389
    ldap_base_dn: Optional[str] = None
    ldap_user_filter: Optional[str] = None
    # TEOS ID ve vatandaşlık numarası ayarları
    enable_teos_id: bool = False
    enable_citizenship_no: bool = False
    require_teos_id: bool = False
    require_citizenship_no: bool = False
    # Birim yöneticisi atama ayarı
    require_manager_assignment: bool = False

class GeneralConfigCreate(GeneralConfigBase):
    pass

class GeneralConfigUpdate(GeneralConfigBase):
    pass

class GeneralConfigResponse(GeneralConfigBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True
