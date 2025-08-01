# 📦 ZYBoard

note: this priject was create by ai github copilot 60%, this project for testing github copilot generating code.

**ZYBoard** adalah platform backend penyimpanan cloud ringan berbasis WebDAV dan MySQL, dibangun dengan stack modern seperti Express.js dan Next.js. Dirancang untuk menjadi alternatif open-source minimalis seperti Nextcloud atau OwnCloud, ZYBoard cocok untuk project personal, pendidikan, maupun prototype bisnis kecil.

---

## 🚀 Fitur Utama

- ✅ Autentikasi pengguna (dengan hashing bcrypt)
- ✅ Upload & manajemen file via WebDAV
- ✅ Integrasi backend menggunakan Express
- ✅ Penyimpanan data pengguna dan file di MySQL

---

## 📚 Teknologi yang Digunakan

| Komponen    | Teknologi                   |
|-------------|-----------------------------|
| Frontend    | React       |
| Backend     | Node.js + Express.js        |
| Database    | MySQL                       |
| Storage     | WebDAV                      |
| Keamanan    | Bcrypt, JWT                 |
| Lainnya     | ESLint, dotenv, CORS, dsb.  |

---

## 🛠️ Instalasi Lokal

clone repository
```bash
git clone https://github.com/fahry-a/zyboard.git
```
cd to repo folder and install dependency
```bash
cd ZYBoard && npm install && npm run install:server
```
setup environment
```bash
cp server/.env.example server/.env
nano server/.env
```
running
```bash
npm run dev 
```