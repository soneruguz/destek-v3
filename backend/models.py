from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()

# Many-to-many association table for user-department relationships
user_department_association = Table(
    'user_departments',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('department_id', Integer, ForeignKey('departments.id'))
)

# Wiki sharing association tables
wiki_user_share = Table(
    'wiki_user_shares',
    Base.metadata,
    Column('wiki_id', Integer, ForeignKey('wikis.id')),
    Column('user_id', Integer, ForeignKey('users.id'))
)

wiki_department_share = Table(
    'wiki_department_shares',
    Base.metadata,
    Column('wiki_id', Integer, ForeignKey('wikis.id')),
    Column('department_id', Integer, ForeignKey('departments.id'))
)

class VisibilityLevel(enum.Enum):
    PUBLIC = "public"              # Herkese açık
    DEPARTMENT = "department"      # Sadece departman içi
    PRIVATE = "private"           # Sadece oluşturan ve atanan kişi
    ADMIN_ONLY = "admin_only"     # Sadece adminler

class UserRole(enum.Enum):
    USER = "user"
    DEPARTMENT_ADMIN = "department_admin"
    SYSTEM_ADMIN = "system_admin"

class Department(Base):
    __tablename__ = "departments"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Departman yöneticisi
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    manager = relationship("User", foreign_keys=[manager_id], back_populates="managed_departments")  # Departman yöneticisi
    primary_users = relationship("User", foreign_keys="User.department_id", back_populates="department")  # Primary department users
    users = relationship("User", secondary=user_department_association, back_populates="departments")  # All department users
    tickets = relationship("Ticket", back_populates="department")
    wikis = relationship("Wiki", back_populates="department")
    shared_wikis = relationship("Wiki", secondary=wiki_department_share, back_populates="shared_departments")

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    full_name = Column(String)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    is_ldap = Column(Boolean, default=False)
    role = Column(Enum(UserRole), default=UserRole.USER)  # Kullanıcı rolü
    department_id = Column(Integer, ForeignKey("departments.id"))  # Primary department
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    department = relationship("Department", back_populates="primary_users", foreign_keys=[department_id])  # Primary department
    departments = relationship("Department", secondary=user_department_association, back_populates="users")  # All departments
    managed_departments = relationship("Department", back_populates="manager", foreign_keys="Department.manager_id")  # Yönetilen departmanlar
    created_tickets = relationship("Ticket", foreign_keys="Ticket.creator_id", back_populates="creator")
    assigned_tickets = relationship("Ticket", foreign_keys="Ticket.assignee_id", back_populates="assignee")
    notification_settings = relationship("NotificationSettings", back_populates="user", uselist=False)
    created_wikis = relationship("Wiki", back_populates="creator")
    shared_wikis = relationship("Wiki", secondary=wiki_user_share, back_populates="shared_users")
    login_logs = relationship("UserLoginLog", back_populates="user")
    
    def can_view_ticket(self, ticket):
        """Kullanıcının bu ticketi görüp göremeyeceğini kontrol eder"""
        # System admin her şeyi görebilir
        if self.role == UserRole.SYSTEM_ADMIN:
            return True
            
        # Ticket sahibi veya atanan kişi her zaman görebilir
        if ticket.creator_id == self.id or ticket.assignee_id == self.id:
            return True
            
        # Görünürlük seviyesine göre kontrol
        if ticket.visibility_level == VisibilityLevel.PUBLIC:
            return True
        elif ticket.visibility_level == VisibilityLevel.DEPARTMENT:
            return self.department_id == ticket.department_id
        elif ticket.visibility_level == VisibilityLevel.PRIVATE:
            return False  # Sadece sahip ve atanan kişi (yukarıda kontrol edildi)
        elif ticket.visibility_level == VisibilityLevel.ADMIN_ONLY:
            return self.role in [UserRole.SYSTEM_ADMIN, UserRole.DEPARTMENT_ADMIN]
            
        return False
    
    def can_edit_ticket(self, ticket):
        """Kullanıcının bu ticketi düzenleyip düzenleyemeyeceğini kontrol eder"""
        # System admin her şeyi düzenleyebilir
        if self.role == UserRole.SYSTEM_ADMIN:
            return True
            
        # Ticket sahibi düzenleyebilir
        if ticket.creator_id == self.id:
            return True
            
        # Atanan kişi durumu ve açıklamayı güncelleyebilir
        if ticket.assignee_id == self.id:
            return True
            
        # Departman admini kendi departmanındaki ticketları düzenleyebilir
        if (self.role == UserRole.DEPARTMENT_ADMIN and 
            self.department_id == ticket.department_id):
            return True
            
        return False

class Ticket(Base):
    __tablename__ = "tickets"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    priority = Column(String)  # low, medium, high, urgent
    status = Column(String, default="open")  # open, in_progress, resolved, closed
    
    # Gelişmiş görünürlük sistemi
    visibility_level = Column(Enum(VisibilityLevel), default=VisibilityLevel.DEPARTMENT)
    
    # Geriye uyumluluk için eski is_private field'ını koruyabiliriz
    is_private = Column(Boolean, default=False)  # Deprecated, visibility_level kullanın
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_escalation_at = Column(DateTime, nullable=True)  # Son otomatik atama zamanı
    escalation_count = Column(Integer, default=0)         # Kaç kez otomatik atandı
    
    # Foreign Keys
    creator_id = Column(Integer, ForeignKey("users.id"))
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"))
    
    # Relationships
    creator = relationship("User", foreign_keys=[creator_id], back_populates="created_tickets")
    assignee = relationship("User", foreign_keys=[assignee_id], back_populates="assigned_tickets")
    department = relationship("Department", back_populates="tickets")
    
    @property
    def visibility_display(self):
        """Görünürlük seviyesini Türkçe olarak döndürür"""
        visibility_map = {
            VisibilityLevel.PUBLIC: "Genel Talep",
            VisibilityLevel.DEPARTMENT: "Departman İçi",
            VisibilityLevel.PRIVATE: "Gizli Talep",
            VisibilityLevel.ADMIN_ONLY: "Sadece Adminler"
        }
        return visibility_map.get(self.visibility_level, "Bilinmiyor")
    
    def get_visibility_for_legacy_compatibility(self):
        """Eski is_private field'ı ile uyumluluk için"""
        if self.is_private:
            return VisibilityLevel.PRIVATE
        return self.visibility_level
        
    def set_visibility_from_legacy(self, is_private_value):
        """Eski is_private değerinden visibility_level ayarlar"""
        if is_private_value:
            self.visibility_level = VisibilityLevel.PRIVATE
        else:
            self.visibility_level = VisibilityLevel.DEPARTMENT
        self.is_private = is_private_value

class Comment(Base):
    __tablename__ = "comments"
    
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign Keys
    user_id = Column(Integer, ForeignKey("users.id"))
    ticket_id = Column(Integer, ForeignKey("tickets.id"))
    
    # Relationships
    user = relationship("User")
    ticket = relationship("Ticket")

class Attachment(Base):
    __tablename__ = "attachments"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    file_path = Column(String)
    content_type = Column(String)
    file_size = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Foreign Keys
    ticket_id = Column(Integer, ForeignKey("tickets.id"))
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    ticket = relationship("Ticket")
    uploader = relationship("User")

class Wiki(Base):
    __tablename__ = "wikis"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    slug = Column(String, unique=True, index=True)
    is_private = Column(Boolean, default=False)
    category = Column(String, nullable=True)  # Kategori
    tags = Column(String, nullable=True)  # Virgülle ayrılmış etiketler
    views = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign Keys
    creator_id = Column(Integer, ForeignKey("users.id"))
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    
    # Relationships
    creator = relationship("User", back_populates="created_wikis")
    department = relationship("Department", back_populates="wikis")
    shared_users = relationship("User", secondary=wiki_user_share, back_populates="shared_wikis")
    shared_departments = relationship("Department", secondary=wiki_department_share, back_populates="shared_wikis")
    revisions = relationship("WikiRevision", back_populates="wiki", cascade="all, delete-orphan")

class WikiRevision(Base):
    __tablename__ = "wiki_revisions"
    
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Foreign Keys
    wiki_id = Column(Integer, ForeignKey("wikis.id"))
    creator_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    wiki = relationship("Wiki", back_populates="revisions")
    creator = relationship("User")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255))
    message = Column(Text)
    type = Column(String(50))  # info, warning, error, success
    is_read = Column(Boolean, default=False)
    related_id = Column(Integer, nullable=True) # İlgili ticket veya wiki ID'si
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Foreign Keys
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    user = relationship("User")

class NotificationSettings(Base):
    __tablename__ = "notification_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    
    # Bildirim tercihleri
    email_notifications = Column(Boolean, default=True)
    browser_notifications = Column(Boolean, default=True)
    
    # Ticket bildirimleri
    ticket_created = Column(Boolean, default=True)
    ticket_assigned = Column(Boolean, default=True)
    ticket_updated = Column(Boolean, default=True)
    ticket_commented = Column(Boolean, default=True)
    ticket_attachment = Column(Boolean, default=True)
    
    # Wiki bildirimleri
    wiki_created = Column(Boolean, default=True)
    wiki_updated = Column(Boolean, default=True)
    wiki_shared = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="notification_settings")

class UserLoginLog(Base):
    __tablename__ = "user_login_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    login_time = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String(45))  # IPv6 support
    user_agent = Column(Text)
    success = Column(Boolean, default=True)
    failure_reason = Column(String)
    
    # Relationships
    user = relationship("User", back_populates="login_logs")

class GeneralConfig(Base):
    __tablename__ = "general_config"
    
    id = Column(Integer, primary_key=True, index=True)
    app_name = Column(String(100), default="Destek Sistemi")
    app_version = Column(String(20), default="1.0.0")
    maintenance_mode = Column(Boolean, default=False)
    maintenance_message = Column(Text, default="Sistem bakım modunda.")
    max_file_size_mb = Column(Integer, default=10)
    allowed_file_types = Column(Text, default="pdf,doc,docx,txt,jpg,jpeg,png,gif,tiff,tif,zip,rar")
    upload_directory = Column(String(255), default="/app/uploads")
    email_notifications_enabled = Column(Boolean, default=True)
    default_department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    smtp_server = Column(String(100))
    smtp_port = Column(Integer, default=587)
    smtp_username = Column(String(100))
    smtp_password = Column(String(100))
    ldap_enabled = Column(Boolean, default=False)
    ldap_server = Column(String(100))
    # Logo URL (relative to /uploads)
    custom_logo_url = Column(String(500), nullable=True)
    ldap_port = Column(Integer, default=389)
    ldap_base_dn = Column(String(200))
    ldap_user_filter = Column(String(200))
    # TEOS ID ve vatandaşlık numarası ayarları
    enable_teos_id = Column(Boolean, default=False)
    enable_citizenship_no = Column(Boolean, default=False)
    require_teos_id = Column(Boolean, default=False)
    require_citizenship_no = Column(Boolean, default=False)
    # Birim yöneticisi atama ayarı - etkinse, birime açılan talepler önce yönetici tarafından gözden geçirilir
    require_manager_assignment = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Workflow & Triage Settings
    workflow_enabled = Column(Boolean, default=False)
    triage_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    triage_department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    
    # Escalation Settings
    escalation_enabled = Column(Boolean, default=False)
    escalation_target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    escalation_target_department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    
    # Timeouts (in minutes)
    timeout_critical = Column(Integer, default=60)    # 1 hour
    timeout_high = Column(Integer, default=240)       # 4 hours
    timeout_medium = Column(Integer, default=480)     # 8 hours
    timeout_low = Column(Integer, default=1440)       # 24 hours

class EmailConfig(Base):
    __tablename__ = "email_config"
    
    id = Column(Integer, primary_key=True, index=True)
    smtp_server = Column(String(100))
    smtp_port = Column(Integer, default=587)
    smtp_username = Column(String(100))
    smtp_password = Column(String(100))
    smtp_use_tls = Column(Boolean, default=True)
    from_email = Column(String(100))
    from_name = Column(String(100), default="Destek Sistemi")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
