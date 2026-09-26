# Sign-Sight — Complete API Specification & JSON Contract

> **Target Audience:** Frontend (UI/UX) Engineers, Machine Learning Engineers, and Integration Developers.  
> **Backend Version:** Django 5.1 / Django REST Framework 3.15  
> **Status:** Production Reference Specification  
> **Base URL:** `http://localhost:8000/api/v1`  
> **Interactive Swagger / OpenAPI 3.0 UI:** `http://localhost:8000/api/docs/`  
> **Raw OpenAPI Schema:** `http://localhost:8000/api/schema/`  

---

## Table of Contents

1. [System Overview & Architecture Contract](#1-system-overview--architecture-contract)
2. [Global Enums & Data Types](#2-global-enums--data-types)
3. [NSL-KDD 41-Feature Ingestion Dictionary](#3-nsl-kdd-41-feature-ingestion-dictionary)
4. [Master Endpoint Quick Reference](#4-master-endpoint-quick-reference)
5. [Exhaustive Endpoint Documentation](#5-exhaustive-endpoint-documentation)
   - [5.1 POST /api/v1/predict/ (Inference & Auto-Alerting)](#51-post-apiv1predict-inference--auto-alerting)
   - [5.2 GET /api/v1/alerts/ (Paginated List & Filter)](#52-get-apiv1alerts-paginated-list--filter)
   - [5.3 GET /api/v1/alerts/{id}/ (Alert Detail & Evidence Inspection)](#53-get-apiv1alertsid-alert-detail--evidence-inspection)
   - [5.4 PATCH /api/v1/alerts/{id}/ (Analyst Triage & Verdict)](#54-patch-apiv1alertsid-analyst-triage--verdict)
   - [5.5 PUT /api/v1/alerts/{id}/ (Full Alert Update)](#55-put-apiv1alertsid-full-alert-update)
   - [5.6 POST /api/v1/alerts/ (Direct / Manual Alert Injection)](#56-post-apiv1alerts-direct--manual-alert-injection)
   - [5.7 GET /api/v1/alerts/stats/ (Aggregated Dashboard Metrics)](#57-get-apiv1alertsstats-aggregated-dashboard-metrics)
   - [5.8 GET /api/v1/models/ (List Registered Models)](#58-get-apiv1models-list-registered-models)
   - [5.9 GET /api/v1/models/{id}/ (Model Artifact & Metrics Detail)](#59-get-apiv1modelsid-model-artifact--metrics-detail)
6. [Error Handling & HTTP Status Code Matrix](#6-error-handling--http-status-code-matrix)
7. [Frontend UI/UX Integration Recipes](#7-frontend-uiux-integration-recipes)
8. [Machine Learning Team Ingestion Contract](#8-machine-learning-team-ingestion-contract)

---

## 1. System Overview & Architecture Contract

Sign-Sight is an ML-powered Network Intrusion Detection System (NIDS) designed for enterprise Security Operations Center (SOC) environments.

```
       [ Network Flow / Agent ]
                   │
                   ▼ (HTTP POST)
         /api/v1/predict/
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
 [ ML Inference ]    [ Is Attack? ]
 (Random Forest)        /       \
                       /         \
                 (Yes)▼           ▼(No)
         Creates Alert        Returns Result
         in PostgreSQL        (No Alert DB Record)
               │
               ▼
   [ SOC Dashboard / Frontend ]
   • GET   /api/v1/alerts/
   • GET   /api/v1/alerts/stats/
   • PATCH /api/v1/alerts/{id}/  (Triage: TP / FP / Escalated)
```

### Architectural Axioms:
1. **Zero Auto-Enforcement:** The system outputs alerts and diagnostic indicators. It **never** drops packets, alters iptables, or closes ports. Enforcement decisions belong exclusively to human analysts.
2. **Deterministic Severity Computation:** Severity is not guessed; it is mapped directly from `(attack_category, confidence)` via a verified severity matrix.
3. **Audit Immutability:** Alerts cannot be deleted via the REST API (HTTP `DELETE` returns `405 Method Not Allowed`). Once logged, alerts form an unalterable audit log.

---

## 2. Global Enums & Data Types

### 2.1 Attack Categories (`attack_category`)
The classifier groups fine-grained signatures into 5 standardized categories:

| Value | Label | Description | Example Signatures |
|---|---|---|---|
| `"NORMAL"` | Normal Traffic | Legitimate, non-malicious network activity | HTTP GET, benign DNS, SSH login |
| `"DOS"` | Denial of Service | Flooding systems to exhaust bandwidth or memory | Neptune, Smurf, Pod, Teardrop, Apache2 |
| `"PROBE"` | Surveillance / Probe | Scanning network topology and port vulnerabilities | Nmap, Portsweep, Satan, IPSweep |
| `"R2L"` | Remote to Local | Unauthorized remote access to local system | Guess_Password, FTP_Write, Imap, Phf |
| `"U2R"` | User to Root | Privilege escalation from regular user to root | Buffer_Overflow, Rootkit, Loadmodule |
| `"UNKNOWN"` | Unknown Signature | Unmapped anomaly or out-of-distribution traffic | Zero-day anomaly |

### 2.2 Severity Levels (`severity`)
Computed dynamically using prediction category and probability confidence:

| Severity Level | Color Code (UI Guide) | Description |
|---|---|---|
| `"CRITICAL"` | `#DC2626` (Red-600) | Immediate threat to core infrastructure (e.g., U2R at $\ge 0.70$ conf, R2L at $\ge 0.90$ conf) |
| `"HIGH"` | `#EA580C` (Orange-600) | Major attack activity requiring prompt investigation (e.g., high-confidence DoS) |
| `"MEDIUM"` | `#F59E0B` (Amber-500) | Suspicious reconnaissance or moderate-confidence anomalies |
| `"LOW"` | `#3B82F6` (Blue-500) | Minor anomalies, low-confidence probes, or trace noise |

### 2.3 Analyst Verdicts (`analyst_verdict`)
Lifecycle status assigned by SOC analysts during alert review:

| Verdict String | Description | Action Triggered |
|---|---|---|
| `"PENDING"` | Initial status of every newly created alert | Appears in active triage queue |
| `"TRUE_POSITIVE"` | Analyst confirms actual malicious intrusion | Alert validated; incident response triggered |
| `"FALSE_POSITIVE"` | Analyst identifies legitimate traffic flagged in error | Cleared from active queue; used for model retrain tuning |
| `"ESCALATED"` | Forwarded to Tier 2/3 SOC or Incident Commander | High-priority escalation |

---

## 3. NSL-KDD 41-Feature Ingestion Dictionary

When calling `/api/v1/predict/`, the `features` dictionary must supply the network flow characteristics. The model accepts these canonical 41 attributes:

### 3.1 Categorical Features (Must be lowercase string)
| Feature Name | Data Type | Permitted / Expected Values | Description |
|---|---|---|---|
| `protocol_type` | `string` | `"tcp"`, `"udp"`, `"icmp"` | Transport layer protocol |
| `service` | `string` | `"http"`, `"smtp"`, `"ftp"`, `"ftp_data"`, `"dns"`, `"ssh"`, `"telnet"`, `"private"`, etc. | Application layer service |
| `flag` | `string` | `"SF"`, `"S0"`, `"REJ"`, `"RSTR"`, `"SH"`, `"RSTO"`, `"S1"`, `"RSTOS0"`, `"S3"`, `"S2"`, `"OTH"` | Connection status flag |

### 3.2 Basic & Flow Features
| Feature Name | Data Type | Range | Description |
|---|---|---|---|
| `duration` | `number` (float) | $\ge 0.0$ | Length of connection in seconds |
| `src_bytes` | `integer` | $\ge 0$ | Bytes transferred from source to destination |
| `dst_bytes` | `integer` | $\ge 0$ | Bytes transferred from destination to source |
| `land` | `integer` | `0` or `1` | 1 if source and destination IP/ports are equal |
| `wrong_fragment` | `integer` | $\ge 0$ | Number of wrong fragments in connection |
| `urgent` | `integer` | $\ge 0$ | Number of urgent packets |

### 3.3 Content Features (Domain / Host Behaviour)
| Feature Name | Data Type | Range | Description |
|---|---|---|---|
| `hot` | `integer` | $\ge 0$ | Number of "hot" indicators (e.g. system directory access) |
| `num_failed_logins` | `integer` | $\ge 0$ | Count of failed authentication attempts |
| `logged_in` | `integer` | `0` or `1` | 1 if successfully logged in; 0 otherwise |
| `num_compromised` | `integer` | $\ge 0$ | Number of compromised conditions detected |
| `root_shell` | `integer` | `0` or `1` | 1 if root shell obtained |
| `su_attempted` | `integer` | `0` or `1` | 1 if `su root` command attempted |
| `num_root` | `integer` | $\ge 0$ | Number of "root" accesses |
| `num_file_creations`| `integer` | $\ge 0$ | Number of file creation operations |
| `num_shells` | `integer` | $\ge 0$ | Number of shell prompts spawned |
| `num_access_files` | `integer` | $\ge 0$ | Number of operations on access control files |
| `num_outbound_cmds` | `integer` | $\ge 0$ | Number of outbound commands in ftp session |
| `is_host_login` | `integer` | `0` or `1` | 1 if login belongs to host admin |
| `is_guest_login` | `integer` | `0` or `1` | 1 if guest user login |

### 3.4 Traffic & Time-Window Features (Past 2 Seconds)
| Feature Name | Data Type | Range | Description |
|---|---|---|---|
| `count` | `integer` | $\ge 0$ | Connections to the same destination host |
| `srv_count` | `integer` | $\ge 0$ | Connections to the same service |
| `serror_rate` | `number` (float) | $0.0 - 1.0$ | % of connections with SYN errors |
| `srv_serror_rate` | `number` (float) | $0.0 - 1.0$ | % of connections with SYN errors for same service |
| `rerror_rate` | `number` (float) | $0.0 - 1.0$ | % of connections with REJ errors |
| `srv_rerror_rate` | `number` (float) | $0.0 - 1.0$ | % of connections with REJ errors for same service |
| `same_srv_rate` | `number` (float) | $0.0 - 1.0$ | % of connections to same service |
| `diff_srv_rate` | `number` (float) | $0.0 - 1.0$ | % of connections to different services |
| `srv_diff_host_rate`| `number` (float) | $0.0 - 1.0$ | % of connections to different hosts |

### 3.5 Host-Based Traffic Features (Past 100 Connections Window)
| Feature Name | Data Type | Range | Description |
|---|---|---|---|
| `dst_host_count` | `integer` | $0 - 255$ | Count of connections to destination host |
| `dst_host_srv_count` | `integer` | $0 - 255$ | Count of connections to same service on destination host |
| `dst_host_same_srv_rate` | `number` (float) | $0.0 - 1.0$ | Same service rate |
| `dst_host_diff_srv_rate` | `number` (float) | $0.0 - 1.0$ | Different service rate |
| `dst_host_same_src_port_rate`| `number` (float)| $0.0 - 1.0$ | Same source port rate |
| `dst_host_srv_diff_host_rate`| `number` (float)| $0.0 - 1.0$ | Different host rate |
| `dst_host_serror_rate` | `number` (float) | $0.0 - 1.0$ | Destination host SYN error rate |
| `dst_host_srv_serror_rate` | `number` (float) | $0.0 - 1.0$ | Destination host service SYN error rate |
| `dst_host_rerror_rate` | `number` (float) | $0.0 - 1.0$ | Destination host REJ error rate |
| `dst_host_srv_rerror_rate` | `number` (float) | $0.0 - 1.0$ | Destination host service REJ error rate |

---

## 4. Master Endpoint Quick Reference

| Method | Path | Handled By | Request Body | Primary Response Code | Purpose |
|---|---|---|---|---|---|
| `POST` | `/api/v1/predict/` | `predict_view` | JSON (flow + features) | `200 OK` / `503 Service Unavailable` | Run ML model; create Alert on attack |
| `GET` | `/api/v1/alerts/` | `AlertViewSet.list` | *None* (Query params) | `200 OK` | Paginated alert feed with filters |
| `GET` | `/api/v1/alerts/{id}/` | `AlertViewSet.retrieve`| *None* | `200 OK` / `404 Not Found` | Single alert details with raw features |
| `PATCH`| `/api/v1/alerts/{id}/` | `AlertViewSet.partial_update` | JSON (verdict, notes) | `200 OK` / `400 Bad Request` | Analyst triage and note saving |
| `PUT` | `/api/v1/alerts/{id}/` | `AlertViewSet.update` | JSON (verdict, notes) | `200 OK` / `400 Bad Request` | Full update of analyst fields |
| `POST` | `/api/v1/alerts/` | `AlertViewSet.create` | JSON (alert payload) | `201 Created` / `400 Bad Request` | Manual alert injection |
| `DELETE`| `/api/v1/alerts/{id}/`| *Disabled* | *None* | `405 Method Not Allowed` | Immutability enforcement |
| `GET` | `/api/v1/alerts/stats/`| `AlertViewSet.stats` | *None* | `200 OK` | Aggregated counts for UI charts |
| `GET` | `/api/v1/models/` | `ModelMetadataViewSet.list` | *None* | `200 OK` | Registered models and metrics |
| `GET` | `/api/v1/models/{id}/`| `ModelMetadataViewSet.retrieve`| *None* | `200 OK` / `404 Not Found` | Model detail and performance scores |

---

## 5. Exhaustive Endpoint Documentation

### 5.1 POST `/api/v1/predict/` (Inference & Auto-Alerting)

Runs real-time ML classification over network traffic attributes. If classified as an attack (`is_attack == true`), an immutable `Alert` instance is automatically committed to the database.

- **URL:** `/api/v1/predict/`
- **Method:** `POST`
- **Headers:**
  ```http
  Content-Type: application/json
  Accept: application/json
  ```

#### Request Body Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PredictRequest",
  "type": "object",
  "required": ["source_ip", "dest_ip", "source_port", "dest_port", "features"],
  "properties": {
    "source_ip": {
      "type": "string",
      "format": "ipv4",
      "example": "192.168.1.105"
    },
    "dest_ip": {
      "type": "string",
      "format": "ipv4",
      "example": "10.0.0.12"
    },
    "source_port": {
      "type": "integer",
      "minimum": 0,
      "maximum": 65535,
      "example": 49152
    },
    "dest_port": {
      "type": "integer",
      "minimum": 0,
      "maximum": 65535,
      "example": 80
    },
    "features": {
      "type": "object",
      "description": "Dictionary of NSL-KDD network attributes",
      "required": ["protocol_type", "service", "flag", "src_bytes", "dst_bytes"],
      "properties": {
        "duration": { "type": "number", "example": 0.0 },
        "protocol_type": { "type": "string", "enum": ["tcp", "udp", "icmp"], "example": "tcp" },
        "service": { "type": "string", "example": "http" },
        "flag": { "type": "string", "example": "SF" },
        "src_bytes": { "type": "integer", "example": 320 },
        "dst_bytes": { "type": "integer", "example": 2048 },
        "land": { "type": "integer", "example": 0 },
        "wrong_fragment": { "type": "integer", "example": 0 },
        "urgent": { "type": "integer", "example": 0 },
        "hot": { "type": "integer", "example": 0 },
        "num_failed_logins": { "type": "integer", "example": 0 },
        "logged_in": { "type": "integer", "example": 1 },
        "num_compromised": { "type": "integer", "example": 0 },
        "root_shell": { "type": "integer", "example": 0 },
        "su_attempted": { "type": "integer", "example": 0 },
        "num_root": { "type": "integer", "example": 0 },
        "num_file_creations": { "type": "integer", "example": 0 },
        "num_shells": { "type": "integer", "example": 0 },
        "num_access_files": { "type": "integer", "example": 0 },
        "num_outbound_cmds": { "type": "integer", "example": 0 },
        "is_host_login": { "type": "integer", "example": 0 },
        "is_guest_login": { "type": "integer", "example": 0 },
        "count": { "type": "integer", "example": 8 },
        "srv_count": { "type": "integer", "example": 8 },
        "serror_rate": { "type": "number", "example": 0.0 },
        "srv_serror_rate": { "type": "number", "example": 0.0 },
        "rerror_rate": { "type": "number", "example": 0.0 },
        "srv_rerror_rate": { "type": "number", "example": 0.0 },
        "same_srv_rate": { "type": "number", "example": 1.0 },
        "diff_srv_rate": { "type": "number", "example": 0.0 },
        "srv_diff_host_rate": { "type": "number", "example": 0.0 },
        "dst_host_count": { "type": "integer", "example": 25 },
        "dst_host_srv_count": { "type": "integer", "example": 25 },
        "dst_host_same_srv_rate": { "type": "number", "example": 1.0 },
        "dst_host_diff_srv_rate": { "type": "number", "example": 0.0 },
        "dst_host_same_src_port_rate": { "type": "number", "example": 0.04 },
        "dst_host_srv_diff_host_rate": { "type": "number", "example": 0.0 },
        "dst_host_serror_rate": { "type": "number", "example": 0.0 },
        "dst_host_srv_serror_rate": { "type": "number", "example": 0.0 },
        "dst_host_rerror_rate": { "type": "number", "example": 0.0 },
        "dst_host_srv_rerror_rate": { "type": "number", "example": 0.0 }
      }
    }
  }
}
```

#### Real Request Example (Denial of Service SYN Flood)
```json
{
  "source_ip": "172.16.0.44",
  "dest_ip": "192.168.1.10",
  "source_port": 58921,
  "dest_port": 80,
  "features": {
    "duration": 0.0,
    "protocol_type": "tcp",
    "service": "http",
    "flag": "S0",
    "src_bytes": 0,
    "dst_bytes": 0,
    "land": 0,
    "wrong_fragment": 0,
    "urgent": 0,
    "hot": 0,
    "num_failed_logins": 0,
    "logged_in": 0,
    "num_compromised": 0,
    "root_shell": 0,
    "su_attempted": 0,
    "num_root": 0,
    "num_file_creations": 0,
    "num_shells": 0,
    "num_access_files": 0,
    "num_outbound_cmds": 0,
    "is_host_login": 0,
    "is_guest_login": 0,
    "count": 254,
    "srv_count": 254,
    "serror_rate": 1.0,
    "srv_serror_rate": 1.0,
    "rerror_rate": 0.0,
    "srv_rerror_rate": 0.0,
    "same_srv_rate": 1.0,
    "diff_srv_rate": 0.0,
    "srv_diff_host_rate": 0.0,
    "dst_host_count": 255,
    "dst_host_srv_count": 255,
    "dst_host_same_srv_rate": 1.0,
    "dst_host_diff_srv_rate": 0.0,
    "dst_host_same_src_port_rate": 1.0,
    "dst_host_srv_diff_host_rate": 0.0,
    "dst_host_serror_rate": 1.0,
    "dst_host_srv_serror_rate": 1.0,
    "dst_host_rerror_rate": 0.0,
    "dst_host_srv_rerror_rate": 0.0
  }
}
```

#### Success Response Body (Attack Detected) — `200 OK`
```json
{
  "prediction": {
    "category": "DOS",
    "confidence": 0.9842,
    "is_attack": true,
    "severity": "CRITICAL"
  },
  "alert_id": 891,
  "alert_url": "/api/v1/alerts/891/"
}
```

#### Success Response Body (Normal Traffic) — `200 OK`
*(Notice `alert_id` and `alert_url` are `null` because benign traffic does not clutter the alert table)*
```json
{
  "prediction": {
    "category": "NORMAL",
    "confidence": 0.9912,
    "is_attack": false,
    "severity": "LOW"
  },
  "alert_id": null,
  "alert_url": null
}
```

#### Error Response Body (No Active Model Trained) — `503 Service Unavailable`
```json
{
  "error": "No active model. Train and register a model first."
}
```

#### cURL Invocation Example
```bash
curl -X POST http://localhost:8000/api/v1/predict/ \
  -H "Content-Type: application/json" \
  -d '{
    "source_ip": "172.16.0.44",
    "dest_ip": "192.168.1.10",
    "source_port": 58921,
    "dest_port": 80,
    "features": {
      "duration": 0.0,
      "protocol_type": "tcp",
      "service": "http",
      "flag": "S0",
      "src_bytes": 0,
      "dst_bytes": 0,
      "count": 250,
      "serror_rate": 1.0
    }
  }'
```

---

### 5.2 GET `/api/v1/alerts/` (Paginated List & Filter)

Retrieves alerts with built-in cursor/offset pagination, chronological reverse sorting, and multidimensional filtering.

- **URL:** `/api/v1/alerts/`
- **Method:** `GET`
- **Query Parameters:**
  | Parameter | Type | Required | Default | Description | Example |
  |---|---|---|---|---|---|
  | `page` | `integer` | No | `1` | Page number in result set | `?page=3` |
  | `severity` | `string` | No | *All* | Filter by severity | `?severity=CRITICAL` |
  | `attack_category` | `string` | No | *All* | Filter by category | `?attack_category=DOS` |
  | `analyst_verdict` | `string` | No | *All* | Filter by triage state | `?analyst_verdict=PENDING` |

#### Success Response Body (`200 OK`)
```json
{
  "count": 1420,
  "next": "http://localhost:8000/api/v1/alerts/?page=2",
  "previous": null,
  "results": [
    {
      "id": 891,
      "timestamp": "2026-09-26T16:45:10.124589Z",
      "source_ip": "172.16.0.44",
      "dest_ip": "192.168.1.10",
      "source_port": 58921,
      "dest_port": 80,
      "protocol": "TCP",
      "attack_category": "DOS",
      "confidence": 0.9842,
      "severity": "CRITICAL",
      "raw_features": {
        "duration": 0.0,
        "protocol_type": "tcp",
        "service": "http",
        "flag": "S0",
        "src_bytes": 0,
        "dst_bytes": 0,
        "count": 254
      },
      "model_version": "rf-nsl-kdd-v1",
      "analyst_verdict": "PENDING",
      "analyst_notes": "",
      "resolved_at": null
    },
    {
      "id": 890,
      "timestamp": "2026-09-26T16:44:02.894102Z",
      "source_ip": "45.33.32.156",
      "dest_ip": "192.168.1.2",
      "source_port": 40120,
      "dest_port": 22,
      "protocol": "TCP",
      "attack_category": "R2L",
      "confidence": 0.8711,
      "severity": "HIGH",
      "raw_features": {
        "duration": 1.2,
        "service": "ssh",
        "num_failed_logins": 5
      },
      "model_version": "rf-nsl-kdd-v1",
      "analyst_verdict": "TRUE_POSITIVE",
      "analyst_notes": "Credential brute-force attack confirmed.",
      "resolved_at": "2026-09-26T16:45:00.000000Z"
    }
  ]
}
```

#### cURL Example
```bash
# Get only pending high/critical alerts
curl -X GET "http://localhost:8000/api/v1/alerts/?severity=CRITICAL&analyst_verdict=PENDING" \
  -H "Accept: application/json"
```

---

### 5.3 GET `/api/v1/alerts/{id}/` (Alert Detail & Evidence Inspection)

Retrieves a single alert instance by primary key. Used by frontend alert modal/drawer to inspect the complete feature vector in `raw_features`.

- **URL:** `/api/v1/alerts/{id}/`
- **Method:** `GET`
- **Path Parameters:**
  - `id` (`integer`): Primary key ID of the alert.

#### Success Response Body (`200 OK`)
```json
{
  "id": 891,
  "timestamp": "2026-09-26T16:45:10.124589Z",
  "source_ip": "172.16.0.44",
  "dest_ip": "192.168.1.10",
  "source_port": 58921,
  "dest_port": 80,
  "protocol": "TCP",
  "attack_category": "DOS",
  "confidence": 0.9842,
  "severity": "CRITICAL",
  "raw_features": {
    "duration": 0.0,
    "protocol_type": "tcp",
    "service": "http",
    "flag": "S0",
    "src_bytes": 0,
    "dst_bytes": 0,
    "count": 254,
    "srv_count": 254,
    "serror_rate": 1.0,
    "dst_host_count": 255
  },
  "model_version": "rf-nsl-kdd-v1",
  "analyst_verdict": "PENDING",
  "analyst_notes": "",
  "resolved_at": null
}
```

#### Error Response (Not Found) — `404 Not Found`
```json
{
  "detail": "No Alert matches the given query."
}
```

---

### 5.4 PATCH `/api/v1/alerts/{id}/` (Analyst Triage & Verdict)

The primary analyst action endpoint. When an analyst reviews an alert in the dashboard and clicks "True Positive", "False Positive", or "Escalate", the frontend issues this call.

- **URL:** `/api/v1/alerts/{id}/`
- **Method:** `PATCH`
- **Permissions:** Unrestricted in dev / Token-authenticated in production.
- **Allowed Fields:** Only `analyst_verdict` and `analyst_notes` may be modified. Detection fields (`confidence`, `severity`, `raw_features`) are read-only to preserve audit integrity.

#### Request Body Schema
```json
{
  "type": "object",
  "properties": {
    "analyst_verdict": {
      "type": "string",
      "enum": ["PENDING", "TRUE_POSITIVE", "FALSE_POSITIVE", "ESCALATED"],
      "description": "Updated review status"
    },
    "analyst_notes": {
      "type": "string",
      "description": "Analyst's investigative notes or justification"
    }
  }
}
```

#### Real Request Body Example
```json
{
  "analyst_verdict": "TRUE_POSITIVE",
  "analyst_notes": "SYN flood verified by firewall log correlation. IP blocked at upstream perimeter gateway."
}
```

#### Success Response Body (`200 OK`)
```json
{
  "analyst_verdict": "TRUE_POSITIVE",
  "analyst_notes": "SYN flood verified by firewall log correlation. IP blocked at upstream perimeter gateway."
}
```

#### Validation Error Response (`400 Bad Request`)
```json
{
  "analyst_verdict": ["\"INVALID_CHOICE\" is not a valid choice."]
}
```

#### cURL Example
```bash
curl -X PATCH http://localhost:8000/api/v1/alerts/891/ \
  -H "Content-Type: application/json" \
  -d '{
    "analyst_verdict": "TRUE_POSITIVE",
    "analyst_notes": "Confirmed malicious volume anomaly."
  }'
```

---

### 5.5 PUT `/api/v1/alerts/{id}/` (Full Alert Update)

Identical to `PATCH`, but requires sending both `analyst_verdict` and `analyst_notes` together.

- **URL:** `/api/v1/alerts/{id}/`
- **Method:** `PUT`
- **Request Body Example:**
  ```json
  {
    "analyst_verdict": "FALSE_POSITIVE",
    "analyst_notes": "Internal vulnerability scanner scheduled run."
  }
  ```
- **Response (`200 OK`):**
  ```json
  {
    "analyst_verdict": "FALSE_POSITIVE",
    "analyst_notes": "Internal vulnerability scanner scheduled run."
  }
  ```

---

### 5.6 POST `/api/v1/alerts/` (Direct / Manual Alert Injection)

Allows external systems, automated sensors, or honeypots to inject alerts directly into the database without running the internal ML model.

- **URL:** `/api/v1/alerts/`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`

#### Request Body (Uses `AlertCreateSerializer`)
```json
{
  "source_ip": "185.220.101.5",
  "dest_ip": "10.0.0.2",
  "source_port": 44301,
  "dest_port": 443,
  "protocol": "TCP",
  "attack_category": "PROBE",
  "confidence": 0.91,
  "raw_features": {
    "probe_type": "port_scan",
    "sensor_id": "snort-edge-01"
  },
  "model_version": "manual-rule-v1"
}
```

#### Success Response (`201 Created`)
```json
{
  "source_ip": "185.220.101.5",
  "dest_ip": "10.0.0.2",
  "source_port": 44301,
  "dest_port": 443,
  "protocol": "TCP",
  "attack_category": "PROBE",
  "confidence": 0.91,
  "raw_features": {
    "probe_type": "port_scan",
    "sensor_id": "snort-edge-01"
  },
  "model_version": "manual-rule-v1"
}
```

---

### 5.7 GET `/api/v1/alerts/stats/` (Aggregated Dashboard Metrics)

Returns pre-aggregated distribution counts. Frontend teams should bind their dashboard Donut, Bar, and Pie charts directly to this endpoint.

- **URL:** `/api/v1/alerts/stats/`
- **Method:** `GET`
- **Response Format:** Direct JSON aggregation

#### Success Response Body (`200 OK`)
```json
{
  "by_category": [
    {
      "attack_category": "DOS",
      "count": 820
    },
    {
      "attack_category": "PROBE",
      "count": 315
    },
    {
      "attack_category": "R2L",
      "count": 185
    },
    {
      "attack_category": "U2R",
      "count": 12
    },
    {
      "attack_category": "UNKNOWN",
      "count": 3
    }
  ],
  "by_severity": [
    {
      "severity": "CRITICAL",
      "count": 210
    },
    {
      "severity": "HIGH",
      "count": 640
    },
    {
      "severity": "MEDIUM",
      "count": 395
    },
    {
      "severity": "LOW",
      "count": 90
    }
  ]
}
```

#### Frontend Dashboard Binding Mapping:
- **Severity Breakdown (Donut Chart):** Map `by_severity` items to chart slices (Critical $\rightarrow$ Red, High $\rightarrow$ Orange, Medium $\rightarrow$ Yellow, Low $\rightarrow$ Blue).
- **Attack Category Breakdown (Bar Chart):** Map `by_category` items to bar columns.

---

### 5.8 GET `/api/v1/models/` (List Registered Models)

Inspects all trained machine learning models, active deployment status, and recorded evaluation metrics.

- **URL:** `/api/v1/models/`
- **Method:** `GET`

#### Success Response Body (`200 OK`)
```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "version": "rf-nsl-kdd-v1",
      "dataset": "NSL-KDD",
      "trained_at": "2026-09-25T18:30:00Z",
      "artifact_path": "artifacts/rf_nsl_kdd_v1.joblib",
      "metrics": {
        "accuracy": 0.8124,
        "macro_auc": 0.9421,
        "classification_report": {
          "NORMAL": { "precision": 0.791, "recall": 0.965, "f1-score": 0.869 },
          "DOS": { "precision": 0.841, "recall": 0.815, "f1-score": 0.828 },
          "PROBE": { "precision": 0.892, "recall": 0.743, "f1-score": 0.810 },
          "R2L": { "precision": 0.652, "recall": 0.285, "f1-score": 0.396 },
          "U2R": { "precision": 0.400, "recall": 0.182, "f1-score": 0.250 }
        },
        "false_positive_rate": {
          "NORMAL": 0.125,
          "DOS": 0.041,
          "PROBE": 0.023,
          "R2L": 0.015,
          "U2R": 0.002
        }
      },
      "is_active": true,
      "notes": "Balanced Random Forest with 200 trees on full KDDTrain+."
    },
    {
      "id": 2,
      "version": "rf-nsl-kdd-v0-test",
      "dataset": "NSL-KDD",
      "trained_at": "2026-09-24T12:00:00Z",
      "artifact_path": "artifacts/rf_nsl_kdd_v0.joblib",
      "metrics": {
        "accuracy": 0.7811,
        "macro_auc": 0.9015
      },
      "is_active": false,
      "notes": "Preliminary experiment with default class weights."
    }
  ]
}
```

---

### 5.9 GET `/api/v1/models/{id}/` (Model Artifact & Metrics Detail)

Retrieves the detailed metadata and metrics for a specific model version.

- **URL:** `/api/v1/models/{id}/`
- **Method:** `GET`
- **Response:** Returns the specific object matching schema in Section 5.8.

---

## 6. Error Handling & HTTP Status Code Matrix

The API uses standard HTTP error response structures.

| Status Code | Meaning | When It Occurs | Example Response Body |
|---|---|---|---|
| `200 OK` | Success | Normal successful retrieval or computation | See endpoint examples |
| `201 Created` | Created | Direct alert posted to `/alerts/` | Serialized record |
| `400 Bad Request` | Validation Error | Missing fields, bad IP format, invalid verdict enum | `{"analyst_verdict": ["Invalid choice."]}` |
| `404 Not Found` | Resource Missing | Non-existent Alert or Model ID requested | `{"detail": "No Alert matches query."}` |
| `405 Method Not Allowed` | Forbidden Verb | Calling `DELETE` on `/alerts/{id}/` | `{"detail": "Method \"DELETE\" not allowed."}` |
| `500 Server Error` | Unhandled Error | Database down or serialization crash | `{"detail": "Internal server error."}` |
| `503 Service Unavailable`| Model Unavailable| Calling `/predict/` when `is_active` model is missing | `{"error": "No active model..."}` |

---

## 7. Frontend UI/UX Integration Recipes

### 7.1 TypeScript Interfaces (Copy-pasteable into Frontend)
```typescript
// types/api.ts

export type AttackCategory = 'NORMAL' | 'DOS' | 'PROBE' | 'R2L' | 'U2R' | 'UNKNOWN';
export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AnalystVerdict = 'PENDING' | 'TRUE_POSITIVE' | 'FALSE_POSITIVE' | 'ESCALATED';

export interface Alert {
  id: number;
  timestamp: string;
  source_ip: string;
  dest_ip: string;
  source_port: number;
  dest_port: number;
  protocol: string;
  attack_category: AttackCategory;
  confidence: number;
  severity: SeverityLevel;
  raw_features: Record<string, any>;
  model_version: string;
  analyst_verdict: AnalystVerdict;
  analyst_notes: string;
  resolved_at: string | null;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AlertStats {
  by_category: { attack_category: AttackCategory; count: number }[];
  by_severity: { severity: SeverityLevel; count: number }[];
}

export interface PredictResponse {
  prediction: {
    category: AttackCategory;
    confidence: number;
    is_attack: boolean;
    severity: SeverityLevel;
  };
  alert_id: number | null;
  alert_url: string | null;
}
```

### 7.2 Fetch API Examples (JavaScript / TypeScript)

#### Fetching Filtered Alerts for the Dashboard:
```typescript
async function fetchAlerts(severity?: string, verdict = 'PENDING', page = 1) {
  const params = new URLSearchParams({ page: page.toString() });
  if (severity) params.append('severity', severity);
  if (verdict) params.append('analyst_verdict', verdict);

  const response = await fetch(`http://localhost:8000/api/v1/alerts/?${params.toString()}`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return (await response.json()) as PaginatedResponse<Alert>;
}
```

#### Updating an Alert Verdict (Analyst Click):
```typescript
async function updateAlertVerdict(alertId: number, verdict: AnalystVerdict, notes: string) {
  const response = await fetch(`http://localhost:8000/api/v1/alerts/${alertId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      analyst_verdict: verdict,
      analyst_notes: notes,
    }),
  });

  if (!response.ok) throw new Error('Failed to update alert verdict');
  return await response.json();
}
```

#### Fetching Chart Statistics:
```typescript
async function fetchDashboardStats(): Promise<AlertStats> {
  const response = await fetch('http://localhost:8000/api/v1/alerts/stats/');
  if (!response.ok) throw new Error('Failed to fetch dashboard stats');
  return await response.json();
}
```

---

## 8. Machine Learning Team Ingestion Contract

For Teammate 3 & Teammate 2 preparing the model artifacts:

1. **Artifact Destination:** Save the fitted scikit-learn model and preprocessor to:
   ```
   D:\07_Development\Sign-Sight\artifacts\rf_nsl_kdd_v1.joblib
   D:\07_Development\Sign-Sight\artifacts\preprocessor_v1.joblib
   ```
2. **Model Metadata Registration:** After training, create a row in the `alerts_modelmetadata` table via Django shell:
   ```bash
   python manage.py shell
   ```
   ```python
   from alerts.models import ModelMetadata
   from django.utils import timezone

   ModelMetadata.objects.create(
       version="rf-nsl-kdd-v1",
       dataset="NSL-KDD",
       trained_at=timezone.now(),
       artifact_path="artifacts/rf_nsl_kdd_v1.joblib",
       metrics={
           "accuracy": 0.8124,
           "macro_auc": 0.9421,
           "classification_report": { ... },
           "false_positive_rate": { ... }
       },
       is_active=True,
       notes="Model trained on balanced NSL-KDD dataset"
   )
   ```
3. **Inference Compatibility:** The model's `predict()` method must return labels matching `LABEL_ORDER`: `["NORMAL", "DOS", "PROBE", "R2L", "U2R"]`.

---

*Sign-Sight Backend Architecture Team — Microsoft × Bennett University Hackathon 2026*
