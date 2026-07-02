// Mock restaurant data for STEP 3 (A flow). Pure data — no rendering/derived
// logic here, so this array can be swapped for a real API response later
// without touching app.js beyond the fetch call itself.
//
// menu[] items intentionally use the exact same schema as the STEP 2
// /api/scan response so buildMenuCard()/buildMenuCardTags() in app.js can
// render them without any adapter code.
window.TOUR_RESTAURANTS = [
  {
    id: "keunmma",
    name: "Keunmma",
    category: "Korean BBQ",
    lat: 35.8156,
    lng: 127.1522,
    rating: 4.6,
    signature_dish: "Grilled Pork Belly",
    tags: ["not_spicy"],
    menu: [
      {
        original_ko: "삼겹살",
        romanization: "samgyeopsal",
        translated_name: "Grilled Pork Belly",
        description: "Thick-cut pork belly grilled tableside, eaten wrapped in lettuce with garlic and ssamjang.",
        price_krw: 16000,
        spice_level: 0,
        main_ingredients: ["pork belly", "garlic", "sesame oil"],
        allergens: ["contains: soy (dipping sauce)"],
        dietary: {
          vegetarian: false,
          vegan: false,
          halal_friendly: false,
          contains_pork: true,
          contains_beef: false,
          contains_alcohol: false
        }
      },
      {
        original_ko: "된장찌개",
        romanization: "doenjang-jjigae",
        translated_name: "Soybean Paste Stew",
        description: "A savory stew made with fermented soybean paste, tofu, zucchini, and vegetables.",
        price_krw: 8000,
        spice_level: 1,
        main_ingredients: ["soybean paste", "tofu", "zucchini"],
        allergens: ["contains: soy", "may_contain: shellfish (broth may use anchovy or shrimp stock)"],
        dietary: {
          vegetarian: false,
          vegan: false,
          halal_friendly: true,
          contains_pork: false,
          contains_beef: false,
          contains_alcohol: false
        }
      }
    ]
  },
  {
    id: "bibim-house",
    name: "Bibim House",
    category: "Bibimbap",
    lat: 35.8149,
    lng: 127.1541,
    rating: 4.4,
    signature_dish: "Jeonju Bibimbap",
    tags: ["vegetarian"],
    menu: [
      {
        original_ko: "전주비빔밥",
        romanization: "jeonju-bibimbap",
        translated_name: "Jeonju Bibimbap",
        description: "Jeonju's signature mixed rice bowl with seasoned vegetables, beef, and a raw egg yolk, served with spicy gochujang sauce on the side.",
        price_krw: 12000,
        spice_level: 2,
        main_ingredients: ["rice", "beef", "assorted vegetables", "egg"],
        allergens: ["contains: egg", "contains: soy"],
        dietary: {
          vegetarian: false,
          vegan: false,
          halal_friendly: false,
          contains_pork: false,
          contains_beef: true,
          contains_alcohol: false
        }
      },
      {
        original_ko: "야채비빔밥",
        romanization: "yachae-bibimbap",
        translated_name: "Vegetable Bibimbap",
        description: "The same mixed rice bowl made with vegetables only, no meat — mix in the gochujang sauce to taste.",
        price_krw: 10000,
        spice_level: 2,
        main_ingredients: ["rice", "assorted vegetables", "gochujang"],
        allergens: ["contains: soy", "may_contain: gluten (gochujang)"],
        dietary: {
          vegetarian: true,
          vegan: false,
          halal_friendly: true,
          contains_pork: false,
          contains_beef: false,
          contains_alcohol: false
        }
      }
    ]
  },
  {
    id: "hanok-pajeon",
    name: "Hanok Pajeon",
    category: "Korean Pancake",
    lat: 35.8162,
    lng: 127.1550,
    rating: 4.5,
    signature_dish: "Seafood Scallion Pancake",
    tags: ["not_spicy", "halal_friendly"],
    menu: [
      {
        original_ko: "해물파전",
        romanization: "haemul-pajeon",
        translated_name: "Seafood Scallion Pancake",
        description: "A crispy pan-fried pancake loaded with scallions, squid, and shrimp — a popular rainy-day snack.",
        price_krw: 14000,
        spice_level: 0,
        main_ingredients: ["scallion", "squid", "shrimp", "wheat batter"],
        allergens: ["contains: shellfish", "contains: wheat", "contains: egg"],
        dietary: {
          vegetarian: false,
          vegan: false,
          halal_friendly: true,
          contains_pork: false,
          contains_beef: false,
          contains_alcohol: false
        }
      },
      {
        original_ko: "막걸리",
        romanization: "makgeolli",
        translated_name: "Makgeolli (Rice Wine)",
        description: "A lightly sweet, milky, sparkling Korean rice wine, traditionally paired with pajeon.",
        price_krw: 6000,
        spice_level: 0,
        main_ingredients: ["rice", "nuruk (fermentation starter)"],
        allergens: ["contains: wheat (nuruk)"],
        dietary: {
          vegetarian: true,
          vegan: true,
          halal_friendly: false,
          contains_pork: false,
          contains_beef: false,
          contains_alcohol: true
        }
      }
    ]
  }
];
