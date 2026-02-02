# Destek Sistemi - Harici API Entegrasyon Kılavuzu

Bu dokümantasyon, harici uygulamaların (ERP, CRM, muhasebe yazılımları vb.) Destek Sistemi ile entegre olmasını sağlayan API'yi açıklar.

---

## İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Kimlik Doğrulama](#kimlik-doğrulama)
3. [API Endpoint'leri](#api-endpointleri)
4. [Webhook Sistemi](#webhook-sistemi)
5. [Örnek Kodlar](#örnek-kodlar)
6. [Hata Kodları](#hata-kodları)
7. [SSS](#sss)

---

## Genel Bakış

### Mimari

```
┌─────────────────────────┐                         ┌─────────────────────────┐
│   HARİCİ UYGULAMA       │                         │   DESTEK SİSTEMİ        │
│   (ERP, CRM, vb.)       │                         │   (API Sağlayıcı)       │
└───────────┬─────────────┘                         └───────────┬─────────────┘
            │                                                   │
            │  ─────── API İsteği ──────►                       │
            │  (Talep aç, sorgula, yorum ekle)                  │
            │                                                   │
            │  ◄────── Webhook ─────────                        │
            │  (Durum değişti, kapandı, vb.)                    │
            └───────────────────────────────────────────────────┘
```

### Temel URL

```
Production: https://destekapi.tesmer.org.tr/api/external
Development: http://localhost:8000/api/external
```

### Özellikler

- ✅ API Key + Secret ile güvenli kimlik doğrulama
- ✅ Talep oluşturma, sorgulama, yorum ekleme
- ✅ Webhook ile gerçek zamanlı bildirimler
- ✅ Rate limiting koruması
- ✅ Departman bazlı erişim kontrolü

---

## Kimlik Doğrulama

### API Anahtarı Alma

1. Destek Sistemi'ne admin olarak giriş yapın
2. **Ayarlar → API Yönetimi** bölümüne gidin
3. "Yeni API Client" butonuna tıklayın
4. Uygulama bilgilerini girin ve kaydedin
5. **API Key** ve **API Secret** değerlerini kopyalayın

> ⚠️ **ÖNEMLİ:** API Secret sadece oluşturma anında gösterilir. Kaybederseniz yeniden oluşturmanız gerekir.

### İstek Header'ları

Tüm API isteklerinde aşağıdaki header'lar zorunludur:

```http
X-API-Key: your-api-key-here
X-API-Secret: your-api-secret-here
Content-Type: application/json
```

### Örnek İstek

```bash
curl -X GET "https://destekapi.tesmer.org.tr/api/external/tickets" \
  -H "X-API-Key: a1b2c3d4e5f67890..." \
  -H "X-API-Secret: x1y2z3w4v5u67890..." \
  -H "Content-Type: application/json"
```

---

## API Endpoint'leri

### 1. Talep Oluşturma

Yeni bir destek talebi oluşturur.

**Endpoint:** `POST /api/external/tickets`

**İstek Gövdesi:**

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `title` | string | ✅ | Talep başlığı |
| `description` | string | ✅ | Talep açıklaması |
| `priority` | string | ❌ | Öncelik: `low`, `medium`, `high`, `urgent` (varsayılan: `medium`) |
| `department_id` | integer | ❌ | Departman ID (belirtilmezse varsayılan kullanılır) |
| `external_ref` | string | ❌ | Harici sistemdeki referans numarası |
| `requester_email` | string | ❌ | Talep sahibinin e-postası |
| `requester_name` | string | ❌ | Talep sahibinin adı |
| `is_private` | boolean | ❌ | Gizli talep mi? (varsayılan: `false`) |
| `teos_id` | string | ❌ | TEOS ID (aktifse) |
| `citizenship_no` | string | ❌ | TC Kimlik No (aktifse) |

**Örnek İstek:**

```bash
curl -X POST "https://destekapi.tesmer.org.tr/api/external/tickets" \
  -H "X-API-Key: your-api-key" \
  -H "X-API-Secret: your-api-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "ERP Fatura Modülü Hatası",
    "description": "Fatura yazdırma işlemi sırasında sistem donuyor.",
    "priority": "high",
    "external_ref": "ERP-2026-001234",
    "requester_name": "Ahmet Yılmaz",
    "requester_email": "ahmet@firma.com"
  }'
```

**Başarılı Yanıt (201 Created):**

```json
{
  "id": 42,
  "title": "ERP Fatura Modülü Hatası",
  "description": "Fatura yazdırma işlemi sırasında sistem donuyor.",
  "status": "open",
  "priority": "high",
  "source": "api",
  "external_ref": "ERP-2026-001234",
  "department_id": 1,
  "department_name": "Bilgi İşlem",
  "assignee_id": null,
  "assignee_name": null,
  "is_private": false,
  "created_at": "2026-02-01T10:30:00",
  "updated_at": null,
  "closed_at": null,
  "comments_count": 0,
  "attachments_count": 0
}
```

---

### 2. Talep Listesi

Bu API client tarafından oluşturulan talepleri listeler.

**Endpoint:** `GET /api/external/tickets`

**Query Parametreleri:**

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| `status` | string | Durum filtresi: `open`, `in_progress`, `resolved`, `closed` |
| `external_ref` | string | Harici referans numarası ile arama |
| `page` | integer | Sayfa numarası (varsayılan: 1) |
| `per_page` | integer | Sayfa başına kayıt (varsayılan: 20, max: 100) |

**Örnek İstek:**

```bash
curl -X GET "https://destekapi.tesmer.org.tr/api/external/tickets?status=open&page=1&per_page=10" \
  -H "X-API-Key: your-api-key" \
  -H "X-API-Secret: your-api-secret"
```

**Başarılı Yanıt (200 OK):**

```json
{
  "tickets": [
    {
      "id": 42,
      "title": "ERP Fatura Modülü Hatası",
      "status": "open",
      "priority": "high",
      "source": "api",
      "external_ref": "ERP-2026-001234",
      "department_name": "Bilgi İşlem",
      "created_at": "2026-02-01T10:30:00",
      "comments_count": 2,
      "attachments_count": 1
    }
  ],
  "total": 15,
  "page": 1,
  "per_page": 10,
  "pages": 2
}
```

---

### 3. Talep Detayı

Belirli bir talebin detayını getirir.

**Endpoint:** `GET /api/external/tickets/{ticket_id}`

**Örnek İstek:**

```bash
curl -X GET "https://destekapi.tesmer.org.tr/api/external/tickets/42" \
  -H "X-API-Key: your-api-key" \
  -H "X-API-Secret: your-api-secret"
```

**Başarılı Yanıt (200 OK):**

```json
{
  "id": 42,
  "title": "ERP Fatura Modülü Hatası",
  "description": "Fatura yazdırma işlemi sırasında sistem donuyor.",
  "status": "in_progress",
  "priority": "high",
  "source": "api",
  "external_ref": "ERP-2026-001234",
  "department_id": 1,
  "department_name": "Bilgi İşlem",
  "assignee_id": 5,
  "assignee_name": "Mehmet Demir",
  "is_private": false,
  "created_at": "2026-02-01T10:30:00",
  "updated_at": "2026-02-01T11:45:00",
  "closed_at": null,
  "comments_count": 3,
  "attachments_count": 1
}
```

---

### 4. Harici Referans ile Talep Getirme

Kendi sisteminizdeki referans numarası ile talep sorgular.

**Endpoint:** `GET /api/external/tickets/by-ref/{external_ref}`

**Örnek İstek:**

```bash
curl -X GET "https://destekapi.tesmer.org.tr/api/external/tickets/by-ref/ERP-2026-001234" \
  -H "X-API-Key: your-api-key" \
  -H "X-API-Secret: your-api-secret"
```

---

### 5. Talep Yorumlarını Getirme

Bir talepteki tüm yorumları listeler.

**Endpoint:** `GET /api/external/tickets/{ticket_id}/comments`

**Örnek İstek:**

```bash
curl -X GET "https://destekapi.tesmer.org.tr/api/external/tickets/42/comments" \
  -H "X-API-Key: your-api-key" \
  -H "X-API-Secret: your-api-secret"
```

**Başarılı Yanıt (200 OK):**

```json
[
  {
    "id": 101,
    "content": "Sorunu inceliyoruz, birazdan dönüş yapacağız.",
    "user_id": 5,
    "user_name": "Mehmet Demir",
    "created_at": "2026-02-01T11:00:00"
  },
  {
    "id": 102,
    "content": "[API - ERP Sistemi] Teşekkürler, bekliyoruz.",
    "user_id": 1,
    "user_name": "Sistem",
    "created_at": "2026-02-01T11:15:00"
  }
]
```

---

### 6. Talebe Yorum Ekleme

Bir talebe yeni yorum ekler.

**Endpoint:** `POST /api/external/tickets/{ticket_id}/comments`

**İstek Gövdesi:**

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `content` | string | ✅ | Yorum içeriği |

**Örnek İstek:**

```bash
curl -X POST "https://destekapi.tesmer.org.tr/api/external/tickets/42/comments" \
  -H "X-API-Key: your-api-key" \
  -H "X-API-Secret: your-api-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Kullanıcı sorunu tekrar bildirdi, acil bakılması gerekiyor."
  }'
```

**Başarılı Yanıt (201 Created):**

```json
{
  "id": 103,
  "content": "[API - ERP Sistemi] Kullanıcı sorunu tekrar bildirdi, acil bakılması gerekiyor.",
  "user_id": 1,
  "user_name": "Sistem",
  "created_at": "2026-02-01T14:30:00"
}
```

> **Not:** API üzerinden eklenen yorumlar otomatik olarak `[API - Uygulama Adı]` etiketi ile işaretlenir.

---

## Webhook Sistemi

Webhook'lar, destek sisteminde bir olay gerçekleştiğinde harici uygulamanıza otomatik bildirim gönderir.

### Desteklenen Olaylar

| Olay | Event Tipi | Açıklama |
|------|------------|----------|
| Talep Oluşturuldu | `ticket.created` | Yeni talep açıldığında |
| Talep Güncellendi | `ticket.updated` | Talep bilgileri değiştiğinde |
| Durum Değişti | `ticket.status_changed` | Talep durumu değiştiğinde |
| Talep Atandı | `ticket.assigned` | Talep birine atandığında |
| Talep Kapandı | `ticket.closed` | Talep kapatıldığında |
| Talep Yeniden Açıldı | `ticket.reopened` | Kapalı talep tekrar açıldığında |
| Yorum Eklendi | `comment.added` | Talebe yorum eklendiğinde |
| Dosya Eklendi | `attachment.added` | Talebe dosya eklendiğinde |

### Webhook Yapılandırma

Admin panelinden API Client'ınız için webhook tanımlayın:

1. **Ayarlar → API Yönetimi** bölümüne gidin
2. İlgili API Client'ı seçin
3. **Webhook'lar** sekmesine tıklayın
4. "Yeni Webhook" butonuna tıklayın
5. Webhook URL'inizi ve dinlemek istediğiniz olayları seçin

### Webhook Payload Formatı

Tüm webhook'lar aşağıdaki formatta gönderilir:

```json
{
  "event": "ticket.status_changed",
  "timestamp": "2026-02-01T14:30:00.000Z",
  "ticket_id": 42,
  "ticket": {
    "id": 42,
    "title": "ERP Fatura Modülü Hatası",
    "description": "Fatura yazdırma işlemi sırasında sistem donuyor.",
    "status": "resolved",
    "priority": "high",
    "source": "api",
    "external_ref": "ERP-2026-001234",
    "department_id": 1,
    "department_name": "Bilgi İşlem",
    "assignee_id": 5,
    "assignee_name": "Mehmet Demir",
    "created_at": "2026-02-01T10:30:00",
    "updated_at": "2026-02-01T14:30:00"
  },
  "changes": {
    "status": "resolved"
  }
}
```

### Yorum Eklendi Olayı

```json
{
  "event": "comment.added",
  "timestamp": "2026-02-01T14:35:00.000Z",
  "ticket_id": 42,
  "ticket": { ... },
  "comment": {
    "id": 104,
    "content": "Sorun çözüldü, test edebilirsiniz.",
    "user_id": 5,
    "created_at": "2026-02-01T14:35:00"
  }
}
```

### Webhook Güvenliği

Webhook isteklerinin gerçekten Destek Sistemi'nden geldiğini doğrulamak için imza kontrolü yapabilirsiniz.

**Header:**
```
X-Webhook-Signature: sha256=a1b2c3d4e5f6...
```

**Doğrulama (Python):**

```python
import hmac
import hashlib

def verify_webhook_signature(payload_body: str, signature: str, secret: str) -> bool:
    """Webhook imzasını doğrula"""
    expected = hmac.new(
        secret.encode('utf-8'),
        payload_body.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(f"sha256={expected}", signature)

# Kullanım
@app.post("/webhooks/destek")
async def handle_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("X-Webhook-Signature", "")
    
    if not verify_webhook_signature(body.decode(), signature, "your-webhook-secret"):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    data = json.loads(body)
    # Webhook'u işle...
```

**Doğrulama (Node.js):**

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
    const expected = 'sha256=' + crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
    
    return crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(signature)
    );
}

// Express.js örneği
app.post('/webhooks/destek', (req, res) => {
    const signature = req.headers['x-webhook-signature'];
    
    if (!verifyWebhookSignature(JSON.stringify(req.body), signature, 'your-secret')) {
        return res.status(401).send('Invalid signature');
    }
    
    // Webhook'u işle...
});
```

### Webhook Yeniden Deneme Politikası

Webhook gönderimi başarısız olursa:

1. İlk deneme başarısız → 60 saniye bekle
2. İkinci deneme başarısız → 60 saniye bekle
3. Üçüncü deneme başarısız → Webhook başarısız olarak işaretlenir

> **Not:** Yeniden deneme sayısı ve bekleme süresi webhook ayarlarından değiştirilebilir.

---

## Örnek Kodlar

### Python Entegrasyonu

```python
import requests
from typing import Optional, Dict, Any

class DestekAPIClient:
    """Destek Sistemi API İstemcisi"""
    
    def __init__(self, base_url: str, api_key: str, api_secret: str):
        self.base_url = base_url.rstrip('/')
        self.headers = {
            'X-API-Key': api_key,
            'X-API-Secret': api_secret,
            'Content-Type': 'application/json'
        }
    
    def create_ticket(
        self,
        title: str,
        description: str,
        priority: str = 'medium',
        external_ref: Optional[str] = None,
        department_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Yeni talep oluştur"""
        payload = {
            'title': title,
            'description': description,
            'priority': priority
        }
        if external_ref:
            payload['external_ref'] = external_ref
        if department_id:
            payload['department_id'] = department_id
        
        response = requests.post(
            f'{self.base_url}/api/external/tickets',
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()
    
    def get_ticket(self, ticket_id: int) -> Dict[str, Any]:
        """Talep detayını getir"""
        response = requests.get(
            f'{self.base_url}/api/external/tickets/{ticket_id}',
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def get_ticket_by_ref(self, external_ref: str) -> Dict[str, Any]:
        """Harici referans ile talep getir"""
        response = requests.get(
            f'{self.base_url}/api/external/tickets/by-ref/{external_ref}',
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def list_tickets(
        self,
        status: Optional[str] = None,
        page: int = 1,
        per_page: int = 20
    ) -> Dict[str, Any]:
        """Talepleri listele"""
        params = {'page': page, 'per_page': per_page}
        if status:
            params['status'] = status
        
        response = requests.get(
            f'{self.base_url}/api/external/tickets',
            headers=self.headers,
            params=params
        )
        response.raise_for_status()
        return response.json()
    
    def add_comment(self, ticket_id: int, content: str) -> Dict[str, Any]:
        """Talebe yorum ekle"""
        response = requests.post(
            f'{self.base_url}/api/external/tickets/{ticket_id}/comments',
            headers=self.headers,
            json={'content': content}
        )
        response.raise_for_status()
        return response.json()
    
    def get_comments(self, ticket_id: int) -> list:
        """Talep yorumlarını getir"""
        response = requests.get(
            f'{self.base_url}/api/external/tickets/{ticket_id}/comments',
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()


# Kullanım örneği
if __name__ == '__main__':
    client = DestekAPIClient(
        base_url='https://destekapi.tesmer.org.tr',
        api_key='your-api-key',
        api_secret='your-api-secret'
    )
    
    # Yeni talep oluştur
    ticket = client.create_ticket(
        title='Test Talebi',
        description='Bu bir test talebidir.',
        priority='medium',
        external_ref='ERP-2026-000001'
    )
    print(f"Talep oluşturuldu: #{ticket['id']}")
    
    # Talep durumunu kontrol et
    ticket_detail = client.get_ticket(ticket['id'])
    print(f"Talep durumu: {ticket_detail['status']}")
    
    # Yorum ekle
    comment = client.add_comment(ticket['id'], 'Ek bilgi: Hata sabah 09:00 civarı oluştu.')
    print(f"Yorum eklendi: #{comment['id']}")
```

### Node.js Entegrasyonu

```javascript
const axios = require('axios');

class DestekAPIClient {
    constructor(baseUrl, apiKey, apiSecret) {
        this.client = axios.create({
            baseURL: baseUrl,
            headers: {
                'X-API-Key': apiKey,
                'X-API-Secret': apiSecret,
                'Content-Type': 'application/json'
            }
        });
    }

    async createTicket(title, description, options = {}) {
        const payload = {
            title,
            description,
            priority: options.priority || 'medium',
            ...options
        };
        
        const response = await this.client.post('/api/external/tickets', payload);
        return response.data;
    }

    async getTicket(ticketId) {
        const response = await this.client.get(`/api/external/tickets/${ticketId}`);
        return response.data;
    }

    async getTicketByRef(externalRef) {
        const response = await this.client.get(`/api/external/tickets/by-ref/${externalRef}`);
        return response.data;
    }

    async listTickets(params = {}) {
        const response = await this.client.get('/api/external/tickets', { params });
        return response.data;
    }

    async addComment(ticketId, content) {
        const response = await this.client.post(
            `/api/external/tickets/${ticketId}/comments`,
            { content }
        );
        return response.data;
    }

    async getComments(ticketId) {
        const response = await this.client.get(`/api/external/tickets/${ticketId}/comments`);
        return response.data;
    }
}

// Kullanım örneği
async function main() {
    const client = new DestekAPIClient(
        'https://destekapi.tesmer.org.tr',
        'your-api-key',
        'your-api-secret'
    );

    try {
        // Yeni talep oluştur
        const ticket = await client.createTicket(
            'Test Talebi',
            'Bu bir test talebidir.',
            { priority: 'high', external_ref: 'ERP-2026-000001' }
        );
        console.log(`Talep oluşturuldu: #${ticket.id}`);

        // Talep durumunu kontrol et
        const detail = await client.getTicket(ticket.id);
        console.log(`Talep durumu: ${detail.status}`);

        // Yorum ekle
        const comment = await client.addComment(ticket.id, 'Ek bilgi eklendi.');
        console.log(`Yorum eklendi: #${comment.id}`);
    } catch (error) {
        console.error('Hata:', error.response?.data || error.message);
    }
}

main();
```

### C# Entegrasyonu

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

public class DestekAPIClient
{
    private readonly HttpClient _client;
    private readonly string _baseUrl;

    public DestekAPIClient(string baseUrl, string apiKey, string apiSecret)
    {
        _baseUrl = baseUrl.TrimEnd('/');
        _client = new HttpClient();
        _client.DefaultRequestHeaders.Add("X-API-Key", apiKey);
        _client.DefaultRequestHeaders.Add("X-API-Secret", apiSecret);
    }

    public async Task<JsonElement> CreateTicketAsync(
        string title, 
        string description, 
        string priority = "medium",
        string externalRef = null)
    {
        var payload = new
        {
            title,
            description,
            priority,
            external_ref = externalRef
        };

        var content = new StringContent(
            JsonSerializer.Serialize(payload),
            Encoding.UTF8,
            "application/json"
        );

        var response = await _client.PostAsync($"{_baseUrl}/api/external/tickets", content);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<JsonElement>(json);
    }

    public async Task<JsonElement> GetTicketAsync(int ticketId)
    {
        var response = await _client.GetAsync($"{_baseUrl}/api/external/tickets/{ticketId}");
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<JsonElement>(json);
    }

    public async Task<JsonElement> AddCommentAsync(int ticketId, string content)
    {
        var payload = new { content };
        var httpContent = new StringContent(
            JsonSerializer.Serialize(payload),
            Encoding.UTF8,
            "application/json"
        );

        var response = await _client.PostAsync(
            $"{_baseUrl}/api/external/tickets/{ticketId}/comments", 
            httpContent
        );
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<JsonElement>(json);
    }
}

// Kullanım
class Program
{
    static async Task Main()
    {
        var client = new DestekAPIClient(
            "https://destekapi.tesmer.org.tr",
            "your-api-key",
            "your-api-secret"
        );

        var ticket = await client.CreateTicketAsync(
            "Test Talebi",
            "Bu bir test talebidir.",
            "high",
            "ERP-2026-000001"
        );

        Console.WriteLine($"Talep oluşturuldu: #{ticket.GetProperty("id")}");
    }
}
```

---

## Hata Kodları

| HTTP Kodu | Açıklama | Çözüm |
|-----------|----------|-------|
| 400 | Geçersiz istek | İstek gövdesini kontrol edin |
| 401 | Kimlik doğrulama hatası | API Key ve Secret değerlerini kontrol edin |
| 403 | Yetki hatası | Bu işlem için izniniz yok |
| 404 | Kaynak bulunamadı | Ticket ID veya referansı kontrol edin |
| 429 | Rate limit aşıldı | Dakikada max istek sayısını aştınız, bekleyin |
| 500 | Sunucu hatası | Destek ekibi ile iletişime geçin |

### Hata Yanıt Formatı

```json
{
  "detail": "Hata mesajı burada görünür"
}
```

---

## SSS

### API Key ve Secret kaybettim, ne yapmalıyım?

Admin panelinden ilgili API Client'ı bulup "Secret Yenile" butonuna tıklayın. Eski secret geçersiz olacak, yeni secret'ı kaydetmeyi unutmayın.

### Webhook'larım çalışmıyor, nasıl test edebilirim?

Admin panelinde Webhook ayarlarında "Test Et" butonu var. Bu buton test payload'ı gönderir ve yanıtı gösterir.

### Hangi departmanlara talep açabilirim?

API Client oluştururken "İzin Verilen Departmanlar" belirlenebilir. Boş bırakılırsa tüm departmanlara erişim sağlanır.

### Rate limit nedir?

Varsayılan olarak dakikada 60 istek yapabilirsiniz. Bu limit API Client ayarlarından değiştirilebilir.

### Webhook imzası nasıl oluşturuluyor?

```
HMAC-SHA256(webhook_secret, request_body)
```

Sonuç hexadecimal olarak kodlanır ve `X-Webhook-Signature` header'ında gönderilir.

### Mevcut web arayüzünden açılan talepler API'de görünür mü?

Hayır. API üzerinden sadece ilgili API Client tarafından açılan talepler görüntülenebilir. Bu güvenlik amacıyla tasarlanmıştır.

### Talep durumunu API üzerinden değiştirebilir miyim?

Şu an için hayır. Talep durumu değişiklikleri sadece Destek Sistemi arayüzünden yapılabilir. Değişiklikler webhook ile size bildirilir.

---

## Destek

API entegrasyonu hakkında sorularınız için:

- 📧 E-posta: bilgiislem@tesmer.org.tr
- 📞 Telefon: (İç Hat)
- 💬 Destek Talebi: Destek Sistemi üzerinden "API Entegrasyonu" kategorisinde talep açın

---

**Versiyon:** 1.0.0  
**Son Güncelleme:** 1 Şubat 2026
