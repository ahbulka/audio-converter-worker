#!/bin/bash
# Deploy Audio Worker to Railway
# Çalıştır: bash deploy-railway.sh

echo "🎵 Audio Worker Deploy Script"
echo "=============================="

# Renkler
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}1. GitHub repo oluşturuluyor...${NC}"
cd audio-worker

# Git init
if [ ! -d .git ]; then
    git init
    git add .
    git commit -m "Initial audio worker for cross-platform audio"
fi

echo ""
echo -e "${YELLOW}2. GitHub repo URL'si gerekli${NC}"
echo "   GitHub'da yeni repo oluştur: https://github.com/new"
echo "   Repo adı önerisi: audio-converter-worker"
echo ""
echo -e "${GREEN}   Oluşturduktan sonra şunu çalıştır:${NC}"
echo "   git remote add origin https://github.com/KULLANICI_ADIN/audio-converter-worker.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""

echo -e "${YELLOW}3. Railway deploy${NC}"
echo "   1. https://railway.app git"
echo "   2. 'New Project' → 'Deploy from GitHub repo'"
echo "   3. audio-converter-worker repo seç"
echo ""

echo -e "${YELLOW}4. Environment Variables${NC}"
echo "   Railway Dashboard → Variables ekle:"
echo ""
echo "   SUPABASE_URL=https://your-project.supabase.co"
echo "   SUPABASE_SERVICE_KEY=eyJ... (service_role key!)"
echo ""

echo -e "${GREEN}5. Deploy!${NC}"
echo "   Railway otomatik deploy edecek"
echo ""

echo -e "${YELLOW}6. Test${NC}"
echo "   Worker URL'ni al: https://your-worker.up.railway.app"
echo "   Test et: curl https://your-worker.up.railway.app/status"
echo ""

echo "✅ Hazır!"
