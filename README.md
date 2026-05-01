# AI Management Pro — Sync-Setup mit Netlify Blobs

## Was wird wofür genutzt?

| Komponente | Zweck |
|---|---|
| **Netlify Blobs** | Sync der App-Daten zwischen Geräten |
| **Firebase Storage** | Nur noch für Datei-Uploads (PDF, DOCX, Bilder) |

## Setup (einmalig)

### 1. Repo aufsetzen

```bash
mkdir ai-management && cd ai-management
# alle Dateien aus diesem Paket dort ablegen, dann:
git init && git add . && git commit -m "Initial setup"
```

### 2. Auf Netlify deployen

- Netlify-Site erstellen, Repo verbinden
- Build-Command leer lassen, Publish-Directory `.`
- `@netlify/blobs` wird automatisch aus der package.json installiert

### 3. Auth-Token setzen (empfohlen!)

In den Netlify Site Settings → Environment Variables:

```
SYNC_AUTH_TOKEN = <dein-geheimer-token>
```

Ohne gesetzten Token sind die Endpoints offen für jeden, der die URL kennt.

### 4. Apps konfigurieren

**Haupt-App (`index.html`)**: Auth-Token in Settings → Storage → Auth-Token eintragen.

**Mobile-App (`recalllab-mobile.html`)**: Beim ersten Start öffnet sich ein Setup-Sheet:
- **URL**: deine Netlify-Domain (z. B. `https://laurin-mgmt.netlify.app`)
- **Auth-Token**: derselbe wie oben

## Endpoints

### `GET /.netlify/functions/blob-get?key=<key>`
- Authorization: `Bearer <SYNC_AUTH_TOKEN>`
- Antwort: JSON-Body, `ETag`-Header
- 404 wenn Key nicht existiert

### `PUT /.netlify/functions/blob-put?key=<key>`
- Authorization: `Bearer <SYNC_AUTH_TOKEN>`
- Body: JSON
- Optional: `If-Match: <etag>` für Konfliktschutz (412 bei Konflikt)
- Antwort: `{ ok: true, key, etag }`

## Schlüssel im Blob-Store

| Key | Inhalt |
|---|---|
| `app-data.json` | Komplettes Daten-Snapshot der Haupt-App |
| `recalllab-mobile.json` | Mobile-Reviews-Delta |
| `readinghub-data.json` | ReadingHub-Daten |

## Troubleshooting

**"401 Unauthorized" auf Mobile** → Auth-Token in der Mobile-App stimmt nicht mit `SYNC_AUTH_TOKEN` überein.

**"404 Not Found" beim ersten Pull** → Die Haupt-App muss zuerst einmal pushen.
