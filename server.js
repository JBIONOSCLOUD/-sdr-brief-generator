const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Servir l'index HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API: Recherche web + analyse prospect
app.post('/api/search', async (req, res) => {
  const { company } = req.body;

  if (!company) {
    return res.status(400).json({ error: 'Company name required' });
  }

  try {
    console.log(`🔍 Searching for: ${company}`);

    // Recherche Google Search (SerpAPI gratuit jusqu'à 100 req/mois)
    const searchResults = await searchCompany(company);

    // Analyse les résultats
    const analysis = generateAnalysis(company, searchResults);

    res.json({
      company,
      searchResults,
      analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ 
      error: 'Search failed',
      message: error.message,
      fallback: generateFallbackAnalysis(company)
    });
  }
});

// Fonction: Recherche web
async function searchCompany(company) {
  try {
    // Option 1: DuckDuckGo (pas de clé API nécessaire)
    const queries = [
      `${company} entreprise site:fr.linkedin.com`,
      `${company} cloud services sector`,
      `${company} employees growth`,
      `${company} news 2025`,
      `${company} partnerships AWS Azure`
    ];

    let allResults = [];

    for (const query of queries) {
      try {
        // Utiliser DuckDuckGo via proxy/API
        const response = await axios.get('https://api.duckduckgo.com/', {
          params: {
            q: query,
            format: 'json',
            no_html: 1
          },
          timeout: 5000
        });

        if (response.data.Results && response.data.Results.length > 0) {
          allResults = allResults.concat(
            response.data.Results.slice(0, 3).map(r => ({
              title: r.Title,
              url: r.FirstURL,
              snippet: r.Result
            }))
          );
        }
      } catch (e) {
        console.log(`Query failed: ${query}`);
      }
    }

    return allResults.slice(0, 10);

  } catch (error) {
    console.error('Search API error:', error.message);
    return [];
  }
}

// Fonction: Analyse prospect
function generateAnalysis(company, searchResults) {
  // Heuristiques simples basées sur résultats search
  const hasCloudKeywords = searchResults.some(r => 
    r.snippet?.toLowerCase().includes('cloud') || 
    r.snippet?.toLowerCase().includes('aws') ||
    r.snippet?.toLowerCase().includes('azure')
  );

  const hasConsultingKeywords = searchResults.some(r =>
    r.snippet?.toLowerCase().includes('conseil') ||
    r.snippet?.toLowerCase().includes('consulting') ||
    r.snippet?.toLowerCase().includes('services')
  );

  const hasTechKeywords = searchResults.some(r =>
    r.snippet?.toLowerCase().includes('technology') ||
    r.snippet?.toLowerCase().includes('it') ||
    r.snippet?.toLowerCase().includes('software')
  );

  return {
    sector: hasConsultingKeywords ? 'Conseil IT / Services' : 'Technologie / Software',
    hasCloudExpertise: hasCloudKeywords,
    likelySize: 'PME à ETI',
    probability: hasCloudKeywords && hasConsultingKeywords ? '75%' : '60%',
    timeline: '6-9 mois',
    topKeywords: extractKeywords(searchResults),
    recommendation: generateRecommendation(company, hasCloudKeywords, hasConsultingKeywords)
  };
}

// Extraction mots-clés
function extractKeywords(results) {
  const keywords = new Set();
  results.forEach(r => {
    const words = r.snippet?.match(/\b[A-Z][a-z]+\b/g) || [];
    words.slice(0, 3).forEach(w => keywords.add(w));
  });
  return Array.from(keywords).slice(0, 5);
}

// Recommandation personnalisée
function generateRecommendation(company, hasCloud, hasConsulting) {
  if (hasCloud && hasConsulting) {
    return `${company} est partenaire idéal. Approche : souveraineté RGPD + réduction TCO.`;
  } else if (hasCloud) {
    return `${company} a expertise cloud. Angle : ISV + productification templates.`;
  } else {
    return `${company} secteur tech/digital. Approche : démonstration PoC gratuit.`;
  }
}

// Fallback si recherche échoue
function generateFallbackAnalysis(company) {
  return {
    company,
    sector: 'Technologie / Services digitaux',
    hasCloudExpertise: true,
    likelySize: 'PME-ETI',
    probability: '65%',
    timeline: '6-9 mois',
    topKeywords: ['Cloud', 'DevOps', 'Architecture', 'IA', 'Données'],
    recommendation: `${company}: Approche générique. À affiner après recherche manuelle.`,
    note: 'Données de fallback - recherche web n\'a pas fonctionné. Utilisez résultats comme base.'
  };
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'online', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 SDR Brief Generator running on http://localhost:${PORT}`);
  console.log(`📝 Open in browser: http://localhost:${PORT}\n`);
});
