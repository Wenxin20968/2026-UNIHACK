/**
 * Vercel Serverless Function for image location identification
 * Uses Google Gemini Vision API to identify campus locations
 * Returns personalized feedback based on identified location
 */

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Get API key from environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set');
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Extract image data and mime type from data URL or base64 string
    let base64Image = image;
    let mimeType = 'image/jpeg'; // default
    
    if (image.startsWith('data:')) {
      // Extract mime type from data URL (e.g., "data:image/png;base64,")
      const mimeMatch = image.match(/data:image\/(\w+);base64,/);
      if (mimeMatch) {
        mimeType = `image/${mimeMatch[1]}`;
      }
      // Remove data URL prefix
      base64Image = image.replace(/^data:image\/\w+;base64,/, '');
    }

    // Call Gemini Vision API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Analyze this image and identify if it shows any of these University of Melbourne campus locations:
- Baillieu Library (or Library)
- Arts West Building (or Arts West)
- Old Quadrangle (or Old Quad)
- Student Pavilion (or Pavilion)
- South Lawn
- Melbourne School of Design (or MSD)

Respond with ONLY the location name if you can identify it, or "Unknown" if you cannot identify any of these locations. Be specific and use the exact location names listed above.`,
                },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Image,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      return res.status(500).json({ 
        error: 'Failed to analyze image',
        details: errorText 
      });
    }

    const geminiData = await geminiResponse.json();
    
    // Extract location from Gemini response
    const locationText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const identifiedLocation = locationText.trim();

    // Map locations to personalized feedback
    const locationPersonalities = {
      'Baillieu Library': {
        location: 'Baillieu Library',
        personality: '卷王人格',
        message: '你发现了 Baillieu Library！这里是学霸的天堂，卷王们的聚集地。📚 在这里，每一本书都是通往知识的钥匙，每一个角落都充满了学术的气息。继续探索，成为真正的卷王！',
        emoji: '📚',
      },
      'Library': {
        location: 'Baillieu Library',
        personality: '卷王人格',
        message: '你发现了图书馆！这里是学霸的天堂，卷王们的聚集地。📚 在这里，每一本书都是通往知识的钥匙，每一个角落都充满了学术的气息。继续探索，成为真正的卷王！',
        emoji: '📚',
      },
      'Arts West Building': {
        location: 'Arts West Building',
        personality: '文艺青年人格',
        message: '你找到了 Arts West Building！这里是创意与文化的交汇点，文艺青年的精神家园。🎨 在这里，艺术与思想碰撞，灵感与创造力交织。你是一个真正的文艺青年！',
        emoji: '🎨',
      },
      'Arts West': {
        location: 'Arts West Building',
        personality: '文艺青年人格',
        message: '你找到了 Arts West！这里是创意与文化的交汇点，文艺青年的精神家园。🎨 在这里，艺术与思想碰撞，灵感与创造力交织。你是一个真正的文艺青年！',
        emoji: '🎨',
      },
      'Old Quadrangle': {
        location: 'Old Quadrangle',
        personality: '历史探索者人格',
        message: '你发现了 Old Quadrangle！这里是历史的见证者，古老与现代的交融。🏰 漫步在这片古老的庭院中，你仿佛穿越时空，感受着百年学府的厚重底蕴。你是一个真正的历史探索者！',
        emoji: '🏰',
      },
      'Old Quad': {
        location: 'Old Quadrangle',
        personality: '历史探索者人格',
        message: '你发现了 Old Quad！这里是历史的见证者，古老与现代的交融。🏰 漫步在这片古老的庭院中，你仿佛穿越时空，感受着百年学府的厚重底蕴。你是一个真正的历史探索者！',
        emoji: '🏰',
      },
      'Student Pavilion': {
        location: 'Student Pavilion',
        personality: '社交达人人格',
        message: '你找到了 Student Pavilion！这里是校园社交的中心，学生活动的聚集地。🎓 在这里，友谊与梦想交织，青春与活力绽放。你是一个真正的社交达人！',
        emoji: '🎓',
      },
      'Pavilion': {
        location: 'Student Pavilion',
        personality: '社交达人人格',
        message: '你找到了 Student Pavilion！这里是校园社交的中心，学生活动的聚集地。🎓 在这里，友谊与梦想交织，青春与活力绽放。你是一个真正的社交达人！',
        emoji: '🎓',
      },
      'South Lawn': {
        location: 'South Lawn',
        personality: '自然爱好者人格',
        message: '你发现了 South Lawn！这里是校园的绿色心脏，自然与活力的象征。🌳 在这里，你可以感受阳光、呼吸新鲜空气，享受校园生活的美好。你是一个真正的自然爱好者！',
        emoji: '🌳',
      },
      'Melbourne School of Design': {
        location: 'Melbourne School of Design',
        personality: '设计大师人格',
        message: '你找到了 Melbourne School of Design！这里是设计的殿堂，创意的摇篮。📐 在这里，每一个设计都蕴含着无限可能，每一处建筑都是艺术的体现。你是一个真正的设计大师！',
        emoji: '📐',
      },
      'MSD': {
        location: 'Melbourne School of Design',
        personality: '设计大师人格',
        message: '你找到了 MSD！这里是设计的殿堂，创意的摇篮。📐 在这里，每一个设计都蕴含着无限可能，每一处建筑都是艺术的体现。你是一个真正的设计大师！',
        emoji: '📐',
      },
    };

    // Find matching location (case-insensitive)
    let matchedLocation = null;
    for (const [key, value] of Object.entries(locationPersonalities)) {
      if (identifiedLocation.toLowerCase().includes(key.toLowerCase()) || 
          key.toLowerCase().includes(identifiedLocation.toLowerCase())) {
        matchedLocation = value;
        break;
      }
    }

    // If no match found, check for partial matches
    if (!matchedLocation) {
      const lowerIdentified = identifiedLocation.toLowerCase();
      if (lowerIdentified.includes('library') || lowerIdentified.includes('图书馆')) {
        matchedLocation = locationPersonalities['Library'];
      } else if (lowerIdentified.includes('arts') || lowerIdentified.includes('west')) {
        matchedLocation = locationPersonalities['Arts West'];
      } else if (lowerIdentified.includes('quad')) {
        matchedLocation = locationPersonalities['Old Quad'];
      } else if (lowerIdentified.includes('pavilion')) {
        matchedLocation = locationPersonalities['Pavilion'];
      } else if (lowerIdentified.includes('lawn') || lowerIdentified.includes('south')) {
        matchedLocation = locationPersonalities['South Lawn'];
      } else if (lowerIdentified.includes('design') || lowerIdentified.includes('msd')) {
        matchedLocation = locationPersonalities['MSD'];
      }
    }

    if (matchedLocation) {
      return res.status(200).json({
        success: true,
        location: matchedLocation.location,
        personality: matchedLocation.personality,
        message: matchedLocation.message,
        emoji: matchedLocation.emoji,
        rawIdentification: identifiedLocation,
      });
    } else {
      return res.status(200).json({
        success: false,
        location: 'Unknown',
        personality: '探索者人格',
        message: `未能识别出已知的校园地点。你识别到的是：${identifiedLocation}。继续探索，发现更多校园的奥秘！🗺️`,
        emoji: '🗺️',
        rawIdentification: identifiedLocation,
      });
    }
  } catch (error) {
    console.error('Error in identify API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
