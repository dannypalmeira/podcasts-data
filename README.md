# 🎙️ Podcasts Data

Dados centralizados de podcasts servidos globalmente via **jsDelivr CDN** + **GitHub**.

## 📡 URLs de Acesso

### JSON (Dados)
```
https://cdn.jsdelivr.net/gh/dannypalmeira/podcasts-data@main/data/podcasts.json
```

### Script Loader
```
https://cdn.jsdelivr.net/gh/dannypalmeira/podcasts-data@main/js/podcast-loader.js
```

## 📁 Estrutura do Projeto

```
podcasts-data/
├── README.md
├── .gitignore
├── data/
│   └── podcasts.json          # Dados dos podcasts
├── js/
│   └── podcast-loader.js      # Script de carregamento
└── docs/
    └── GUIA_SETUP.md          # Guia de configuração
```

## 🚀 Como Usar

### HTML
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Meus Podcasts</title>
</head>
<body>
  <!-- Contêiner para podcasts -->
  <div id="tabela"></div>
  
  <!-- Paginação -->
  <ul id="paginacao"></ul>

  <!-- Script do jsDelivr -->
  <script src="https://cdn.jsdelivr.net/gh/dannypalmeira/podcasts-data@main/js/podcast-loader.js"></script>
</body>
</html>
```

## 📝 Adicionar Novo Podcast

1. Edite o arquivo `data/podcasts.json`
2. Adicione um novo objeto ao array:

```json
{
  "data": "10.03.2026",
  "tit": "Episódio #42",
  "intervistato": "João Silva",
  "descrizione": "Discussão sobre tecnologia e inovação",
  "audio": "episode-42.mp3"
}
```

3. Faça commit e push:
```bash
git add data/podcasts.json
git commit -m "Add podcast episode #42"
git push origin main
```

4. **Pronto!** A atualização estará disponível no jsDelivr em segundos.

## 🔄 Criar Versão Estável (Release)

Para usar uma versão específica:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Então use no código:
```html
<script src="https://cdn.jsdelivr.net/gh/dannypalmeira/podcasts-data@v1.0.0/js/podcast-loader.js"></script>
```

## ✅ Checklist

- [x] Repositório público
- [x] Arquivo `data/podcasts.json`
- [x] Arquivo `js/podcast-loader.js`
- [x] README.md

## 🌐 Compatibilidade

- ✅ Todos os navegadores modernos
- ✅ Mobile responsivo
- ✅ Suporte offline (cache local)
- ✅ CORS automático (jsDelivr)

## 📊 Estatísticas

- Repositório: `dannypalmeira/podcasts-data`
- CDN: jsDelivr (global)
- Cache: 1 hora local + cache global jsDelivr
- Limite: Nenhum (GitHub + jsDelivr gratuito)

## 🤝 Contribuir

Edite o arquivo JSON e faça um push!

## 📞 Suporte

Para mais informações sobre jsDelivr: https://www.jsdelivr.com/
Para mais informações sobre GitHub: https://github.com/

---

**Última atualização:** 2026-03-10
