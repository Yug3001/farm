/**
 * Query Classifier for Hybrid AI Approach
 * Determines if a query is simple (use knowledge base) or complex (use Gemini AI)
 * This saves API calls by handling common questions locally
 */

class QueryClassifier {
    constructor() {
        // Simple query patterns that can be answered from knowledge base
        this.simplePatterns = [
            // What is questions - fertilizers & nutrients
            /what\s+is\s+(npk|nitrogen|phosphorus|potassium|urea|dap|mop|sop|fym|compost)/i,
            /what\s+is\s+(drip|sprinkler|irrigation|mulching|composting|vermicompost)/i,
            /what\s+is\s+(organic\s+farming|hydroponics|greenhouse|kharif|rabi)/i,
            /what\s+is\s+(pm\s*kisan|kcc|fasal\s+bima|soil\s+health\s+card)/i,

            // Basic crop information
            /how\s+to\s+grow\s+(rice|wheat|cotton|sugarcane|maize|potato|tomato|onion)/i,
            /when\s+to\s+plant\s+(rice|wheat|cotton|sugarcane|maize|potato|tomato)/i,
            /best\s+season\s+for\s+(rice|wheat|cotton|sugarcane|maize)/i,

            // Common pests and diseases
            /what\s+is\s+(aphids?|whiteflies|bollworm|termites?|blight|rust|mildew)/i,
            /how\s+to\s+control\s+(aphids?|whiteflies|bollworm|termites?)/i,

            // Soil types
            /what\s+is\s+(clay|sandy|loam|black|red|acidic|alkaline)\s+soil/i,
            /types?\s+of\s+soil/i,

            // Nutrient deficiencies
            /(nitrogen|phosphorus|potassium|zinc)\s+deficiency/i,
            /yellow\s+leaves/i,

            // Government schemes
            /(pm\s*kisan|kcc|fasal\s+bima|pmksy|kusum|enam|msp)\s+(scheme|yojana)/i,

            // General farming practices
            /crop\s+rotation/i,
            /soil\s+testing/i,
            /market\s+prices?/i,
            /weather\s+forecast/i
        ];

        // Keywords that indicate simple queries
        this.simpleKeywords = [
            'what is', 'define', 'meaning of', 'types of',
            'list', 'name', 'which', 'when to plant',
            'best season', 'how to grow', 'basic',
            'simple', 'introduction', 'overview'
        ];

        // Keywords that indicate complex queries requiring AI
        this.complexKeywords = [
            'analyze', 'analysis', 'diagnos', 'recommend', 'suggest',
            'my farm', 'my soil', 'my crop', 'my field', 'problem with',
            'not growing', 'dying', 'disease spreading',
            'calculate', 'compare', 'which is better',
            'specific to', 'in my area', 'for my region',
            'multiple', 'combination', 'together',
            'ph 6', 'ph 7', 'ph 8', 'ph 5', 'ph 4',
            'nitrogen 2', 'phosphorus 1', 'potassium 3'
        ];

        // Knowledge base topics (from existing responses object)
        this.knowledgeBaseTopics = [
            // Fertilizers & nutrients
            'npk', 'nitrogen', 'phosphorus', 'potassium', 'urea', 'dap', 'mop', 'sop',
            'vermicompost', 'compost', 'fym',
            // Crops
            'rice', 'paddy', 'wheat', 'tomato', 'potato', 'cotton',
            'sugarcane', 'maize', 'soybean', 'mustard', 'onion',
            'chilli', 'groundnut', 'chickpea', 'banana', 'mango',
            'kharif', 'rabi',
            // Soil types
            'clay soil', 'sandy soil', 'loam soil', 'black soil',
            'red soil', 'acidic soil', 'alkaline soil',
            // Deficiencies
            'nitrogen deficiency', 'phosphorus deficiency',
            'potassium deficiency', 'zinc deficiency',
            // Pests & diseases
            'aphids', 'whiteflies', 'bollworm', 'termites',
            'stem borer', 'fruit fly', 'blight disease',
            'rust disease', 'powdery mildew', 'wilt disease',
            // Irrigation & techniques
            'drip irrigation', 'sprinkler irrigation', 'hydroponics',
            'organic farming', 'mulching', 'crop rotation',
            'greenhouse farming', 'vertical farming',
            'precision agriculture',
            // Govt schemes
            'pm kisan scheme', 'kisan credit card', 'fasal bima yojana',
            'soil health card', 'pmksy subsidy', 'kusum scheme',
            'enam platform', 'minimum support price',
            // General
            'weather forecast', 'market prices', 'soil testing',
            'compost making', 'integrated pest management'
        ];
    }

    /**
     * Classify query as 'simple' or 'complex'
     * @param {string} question - User's question
     * @returns {object} - { type: 'simple'|'complex', confidence: 0-1, reason: string }
     */
    classify(question) {
        const lowerQuestion = question.toLowerCase().trim();

        // Check for complex keywords first (higher priority)
        for (const keyword of this.complexKeywords) {
            if (lowerQuestion.includes(keyword)) {
                return {
                    type: 'complex',
                    confidence: 0.9,
                    reason: `Contains complex keyword: "${keyword}"`
                };
            }
        }

        // Check if question matches simple patterns
        for (const pattern of this.simplePatterns) {
            if (pattern.test(lowerQuestion)) {
                return {
                    type: 'simple',
                    confidence: 0.95,
                    reason: 'Matches simple query pattern'
                };
            }
        }

        // Check if question is about a known knowledge base topic
        let topicMatch = false;
        for (const topic of this.knowledgeBaseTopics) {
            if (lowerQuestion.includes(topic)) {
                topicMatch = true;
                break;
            }
        }

        // Check for simple keywords
        let hasSimpleKeyword = false;
        for (const keyword of this.simpleKeywords) {
            if (lowerQuestion.includes(keyword)) {
                hasSimpleKeyword = true;
                break;
            }
        }

        // Decision logic
        if (topicMatch && hasSimpleKeyword) {
            return {
                type: 'simple',
                confidence: 0.85,
                reason: 'Known topic with simple keyword'
            };
        }

        if (topicMatch && lowerQuestion.length < 50) {
            return {
                type: 'simple',
                confidence: 0.75,
                reason: 'Known topic with short question'
            };
        }

        // Check question length and complexity
        const wordCount = lowerQuestion.split(/\s+/).length;
        const hasNumbers = /\d/.test(lowerQuestion);
        const hasMultipleClauses = (lowerQuestion.match(/,|and|but|or/g) || []).length > 2;

        if (wordCount <= 8 && !hasNumbers && !hasMultipleClauses && topicMatch) {
            return {
                type: 'simple',
                confidence: 0.7,
                reason: 'Short, simple question about known topic'
            };
        }

        // Default to complex for personalized/specific queries
        if (hasNumbers || hasMultipleClauses || wordCount > 15) {
            return {
                type: 'complex',
                confidence: 0.8,
                reason: 'Contains specific details or multiple clauses'
            };
        }

        // If unsure, default to simple if topic is known, else complex
        if (topicMatch) {
            return {
                type: 'simple',
                confidence: 0.6,
                reason: 'Known topic, defaulting to knowledge base'
            };
        }

        return {
            type: 'complex',
            confidence: 0.65,
            reason: 'Unknown topic, using AI for best response'
        };
    }

    /**
     * Get statistics about query classification
     * @param {string} question 
     * @returns {object} - Detailed analysis
     */
    analyze(question) {
        const classification = this.classify(question);
        const lowerQuestion = question.toLowerCase();

        return {
            ...classification,
            questionLength: question.length,
            wordCount: question.split(/\s+/).length,
            hasNumbers: /\d/.test(question),
            matchedTopics: this.knowledgeBaseTopics.filter(topic =>
                lowerQuestion.includes(topic)
            ),
            matchedSimpleKeywords: this.simpleKeywords.filter(keyword =>
                lowerQuestion.includes(keyword)
            ),
            matchedComplexKeywords: this.complexKeywords.filter(keyword =>
                lowerQuestion.includes(keyword)
            )
        };
    }
}

module.exports = QueryClassifier;
