/* =============================================
   Module Name — AI Service
   Abstraction layer for interacting with AI models
   (Gemini, OpenAI, Cloudinary). Handles caching,
   retries, and formatting.
   ============================================= */

const AIService = {
    // API Endpoints
    GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
    OPENAI_API_URL: 'https://api.openai.com/v1/chat/completions',
    
    // Prompts (Domain specific)
    // Prompts (Domain specific)
    PROMPTS: {
        SUGGEST_DECK_CARDS: `You are a professional Tarot expert. Provide a comprehensive list of cards for the requested deck.
Output ONLY a valid JSON array of objects, with NO markdown formatting, NO code blocks, and NO other text before or after.
Format required:
[
  { 
    "name": "Card Name in English", 
    "suit": "Wands/Cups/Swords/Pentacles (or null for non-tarot)", 
    "arcana": "major/minor/extra (or null for non-tarot)"
  }
]
Deck requested: {deckName}
Category: {category}`,

        GENERATE_CARD_DETAILS: `You are a professional Tarot reader and translator. Provide details for the requested card.
If Reference Text is provided, extract the meaning from it and summarize it. If no Reference Text is provided, use your general knowledge of the card.
Return a valid JSON object ONLY, NO markdown blocks, NO code blocks, NO extra text.
Format required:
{
  "nameVi": "Vietnamese translated card name",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "details": "Summary of upright meaning in Vietnamese (keep it rich but concise, min 3 sentences)",
  "reversedDetails": "Summary of reversed meaning in Vietnamese (keep it rich but concise, min 3 sentences)"
}
Deck Name: {deckName}
Card Name: {cardName}
Reference Text: {referenceText}`,

        PARSE_COMPANION_BULK: `You are an expert at parsing raw structured text from Tarot companion books.
I have a list of cards in a deck, and a block of text from the companion book.
Your task is to find the exact text describing each card from the text block.
MATCH the text rigidly to the provided card names.
Return ONLY a valid JSON object mapping the Card Name to its extracted text.
Example format:
{
  "The Fool": "The Fool represents new beginnings...",
  "The Magician": "The Magician is a card of manifestation..."
}
If a card's text is not found, map its value to null.
Do NOT use markdown blocks.

Deck Name: {deckName}
Target Cards to find: {cardNames}

Raw Text Block:
{rawText}`
    },

    isGeminiAvailable() {
        return !!App.settings.geminiApiKey;
    },

    /**
     * Check if OpenAI is configured
     */
    isOpenAIAvailable() {
        return !!App.settings.openaiApiKey;
    },

    /**
     * Test Gemini Connection
     */
    async testGemini() {
        if (!this.isGeminiAvailable()) throw new Error("Chưa có API Key Gemini");
        const response = await this._callGemini("Respond only with the word 'OK'", 'gemini-1.5-flash');
        if (!response || !response.toLowerCase().includes('ok')) throw new Error("Phản hồi lỗi.");
        return true;
    },

    /**
     * Test OpenAI Connection
     */
    async testOpenAI() {
        if (!this.isOpenAIAvailable()) throw new Error("Chưa có API Key OpenAI");
        const response = await fetch(this.OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${App.settings.openaiApiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: 'Respond only with OK' }],
                max_tokens: 5
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP Error ${response.status}`);
        }
        return true;
    },

    /**
     * Generate structured list of cards for a deck
     * @param {string} deckName 
     * @param {'tarot'|'oracle'|'lenormand'} category 
     * @returns {Promise<Array>} Array of card objects
     */
    async suggestDeckCards(deckName, category) {
        if (category === 'lenormand') {
            return this._getLenormandStandardDeck();
        }

        if (category === 'tarot' && deckName.toLowerCase().trim() === 'standard') {
            return this._getTarotStandardDeck();
        }

        if (!this.isGeminiAvailable()) {
            throw new Error("Vui lòng cấu hình Gemini API Key trong Cài đặt để sử dụng tính năng AI gợi ý.");
        }

        const prompt = this.PROMPTS.SUGGEST_DECK_CARDS
            .replace('{deckName}', deckName)
            .replace('{category}', category);

        try {
            const rawResponse = await this._callGemini(prompt, 'gemini-1.5-flash');
            
            // Extract JSON from response (handle potential markdown formatting)
            let jsonString = rawResponse;
            const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                jsonString = jsonMatch[1];
            }
            
            const parsed = JSON.parse(jsonString.trim());
            
            if (!Array.isArray(parsed)) {
                throw new Error("Invalid format received from AI.");
            }
            
            return parsed;
        } catch (error) {
            console.error("AI Auto-suggest Error:", error);
            throw new Error(`Lỗi nhận diện AI: ${error.message}`);
        }
    },

    /**
     * Auto generate card details (nameVi, keywords, meanings) using Gemini
     * @param {string} deckName 
     * @param {string} cardName 
     * @param {string} referenceText Optional raw text from companion book
     * @returns {Promise<Object>} {nameVi, keywords, details, reversedDetails}
     */
    async generateCardDetails(deckName, cardName, referenceText = '') {
        if (!this.isGeminiAvailable()) {
            throw new Error("Vui lòng cấu hình Gemini API Key để tự động dịch và điền thông tin.");
        }

        const prompt = this.PROMPTS.GENERATE_CARD_DETAILS
            .replace('{deckName}', deckName)
            .replace('{cardName}', cardName)
            .replace('{referenceText}', referenceText ? referenceText.substring(0, 3000) : 'None'); // limit length to avoid massive tokens

        try {
            const rawResponse = await this._callGemini(prompt, 'gemini-1.5-flash');
            
            let jsonString = rawResponse;
            const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                jsonString = jsonMatch[1];
            }
            
            const parsed = JSON.parse(jsonString.trim());
            return parsed;
        } catch (error) {
            console.error("AI Generate Card Details Error:", error);
            throw new Error(`Lỗi Dịch AI: ${error.message}`);
        }
    },

    /**
     * Parse bulk raw text to map descriptions to target cards
     * @param {string} deckName 
     * @param {Array<string>} cardNames 
     * @param {string} rawText 
     * @returns {Promise<Object>} Map of cardName -> description text
     */
    async parseCompanionBulk(deckName, cardNames, rawText) {
        if (!this.isGeminiAvailable()) {
            throw new Error("Vui lòng cấu hình Gemini API Key.");
        }

        const prompt = this.PROMPTS.PARSE_COMPANION_BULK
            .replace('{deckName}', deckName)
            .replace('{cardNames}', JSON.stringify(cardNames))
            .replace('{rawText}', rawText.substring(0, 15000)); // limit 15k chars per chunk roughly

        try {
            const rawResponse = await this._callGemini(prompt, 'gemini-1.5-flash');
            
            let jsonString = rawResponse;
            const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                jsonString = jsonMatch[1];
            }
            
            const parsed = JSON.parse(jsonString.trim());
            return parsed;
        } catch (error) {
            console.error("AI Parse Companion Error:", error);
            throw new Error(`Lỗi Đọc Sách AI: ${error.message}`);
        }
    },

    /**
     * Enhance image using Cloudinary (Auto Crop, Sharpen, Optimize)
     * @param {File|Blob} imageFile 
     * @returns {Promise<string>} URL of the enhanced image
     */
    async enhanceImage(imageFile) {
        const cloudName = App.settings.cloudinaryCloudName;
        const uploadPreset = App.settings.cloudinaryUploadPreset;

        if (!cloudName || !uploadPreset) {
            throw new Error("Vui lòng cấu hình Cloudinary trong phần Cài đặt để sử dụng tính năng xử lý ảnh.");
        }

        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('upload_preset', uploadPreset);
        
        // Add transformations for Tarot cards:
        // - c_fill,g_auto: Smart crop to fit bounds while keeping subject centered
        // - e_improve: Auto enhance colors/contrast
        // - e_sharpen: Sharpen details
        // - q_auto,f_webp: Automatic quality and WebP format
        formData.append('transformation', 'c_fill,g_auto,e_improve,e_sharpen,q_auto,f_webp');

        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

        try {
            const response = await fetch(uploadUrl, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error?.message || `HTTP Error ${response.status}`);
            }

            const data = await response.json();
            return data.secure_url; // Return the URL of the processed image
        } catch (error) {
            console.error("Cloudinary Enhancement Error:", error);
            throw new Error(`Lỗi xử lý ảnh: ${error.message}`);
        }
    },

    /**
     * Call Google Gemini API
     * @param {string} prompt 
     * @param {string} model 
     * @returns {Promise<string>}
     */
    async _callGemini(prompt, model = 'gemini-1.5-flash') {
        const apiKey = App.settings.geminiApiKey;
        if (!apiKey) throw new Error("Missing Gemini API Key");

        const url = `${this.GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.2, // Low temp for structured JSON output
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP Error ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error("No response generated.");
        }

        return data.candidates[0].content.parts[0].text;
    },

    /**
     * Standard Lenormand 36 cards
     */
    _getLenormandStandardDeck() {
        const names = [
            "Rider", "Clover", "Ship", "House", "Tree", "Clouds", 
            "Snake", "Coffin", "Bouquet", "Scythe", "Whip", "Birds",
            "Child", "Fox", "Bear", "Stars", "Stork", "Dog",
            "Tower", "Garden", "Mountain", "Crossroads", "Mice", "Heart",
            "Ring", "Book", "Letter", "Man", "Woman", "Lily",
            "Sun", "Moon", "Key", "Fish", "Anchor", "Cross"
        ];
        return names.map((name, i) => ({
            name: `${i + 1} - ${name}`,
            suit: null,
            arcana: null
        }));
    },

    /**
     * Standard Tarot 78 cards
     */
    _getTarotStandardDeck() {
        const cards = [];
        
        // Major Arcana (22)
        const majors = [
            "The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor",
            "The Hierophant", "The Lovers", "The Chariot", "Strength", "The Hermit",
            "Wheel of Fortune", "Justice", "The Hanged Man", "Death", "Temperance",
            "The Devil", "The Tower", "The Star", "The Moon", "The Sun",
            "Judgement", "The World"
        ];
        
        majors.forEach((name, i) => {
            cards.push({ name: `${i === 0 ? '0' : i} - ${name}`, suit: null, arcana: 'major' });
        });

        // Minor Arcana (56)
        const suits = ['Wands', 'Cups', 'Swords', 'Pentacles'];
        const pips = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Page', 'Knight', 'Queen', 'King'];
        
        suits.forEach(suit => {
            pips.forEach(pip => {
                cards.push({ name: `${pip} of ${suit}`, suit: suit, arcana: 'minor' });
            });
        });

        return cards;
    }
};

window.AIService = AIService;
