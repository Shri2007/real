// Everyday things students swipe on in For you. Each swipe moves the taste weights for its tags, which is what
// later surfaces matching brands with UGC jobs. Photos: Unsplash.
export const CATALOG = [
  { key: "baggy-jeans", title: "Baggy jeans", subtitle: "Loose fit, everyday", tags: ["fashion"], image: "https://images.unsplash.com/photo-1774128089573-b665aba7a907?w=900&h=1100&fit=crop&q=80" },
  { key: "white-sneakers", title: "Clean white sneakers", subtitle: "Goes with everything", tags: ["fashion"], image: "https://images.unsplash.com/photo-1596778273230-ebf5667f7c41?w=900&h=1100&fit=crop&q=80" },
  { key: "denim-jacket", title: "Thrifted denim jacket", subtitle: "Secondhand, one of one", tags: ["fashion"], image: "https://images.unsplash.com/photo-1580911035415-73036934b4e0?w=900&h=1100&fit=crop&q=80" },
  { key: "iced-latte", title: "Iced oat latte", subtitle: "The 9am essential", tags: ["food"], image: "https://images.unsplash.com/photo-1773064987645-bd4969f322a9?w=900&h=1100&fit=crop&q=80" },
  { key: "ramen", title: "Late-night ramen", subtitle: "Dorm food, upgraded", tags: ["food"], image: "https://images.unsplash.com/photo-1771142673079-0b7608350892?w=900&h=1100&fit=crop&q=80" },
  { key: "energy-drink", title: "Energy drink before class", subtitle: "Zero sugar, all caffeine", tags: ["energy drinks", "study"], image: "https://images.unsplash.com/photo-1670172072742-d87fdc876ff8?w=900&h=1100&fit=crop&q=80" },
  { key: "gym", title: "5am gym sessions", subtitle: "Before anyone's awake", tags: ["gym"], image: "https://images.unsplash.com/photo-1641337221253-fdc7237f6b61?w=900&h=1100&fit=crop&q=80" },
  { key: "skincare", title: "Glass-skin routine", subtitle: "Serums, SPF, the works", tags: ["skincare"], image: "https://images.unsplash.com/photo-1741896135512-084b251887f7?w=900&h=1100&fit=crop&q=80" },
  { key: "desk-setup", title: "Desk setup", subtitle: "Mechanical keyboard, warm light", tags: ["tech", "study"], image: "https://images.unsplash.com/photo-1743862558369-5dcea79ccbff?w=900&h=1100&fit=crop&q=80" },
  { key: "headphones", title: "Noise-cancelling headphones", subtitle: "Library mode on", tags: ["music", "tech"], image: "https://images.unsplash.com/photo-1505740106531-4243f3831c78?w=900&h=1100&fit=crop&q=80" },
  { key: "vinyl", title: "Vinyl nights", subtitle: "Records over playlists", tags: ["music"], image: "https://images.unsplash.com/photo-1762776531884-42171ff9e9fe?w=900&h=1100&fit=crop&q=80" },
  { key: "puppy", title: "Dog content", subtitle: "Golden retrievers only", tags: ["pets"], image: "https://images.unsplash.com/photo-1760615302725-4a6f097e56e0?w=900&h=1100&fit=crop&q=80" },
  { key: "concerts", title: "Live concerts", subtitle: "Front row or nothing", tags: ["music", "travel"], image: "https://images.unsplash.com/photo-1763630053969-77a1d7d85572?w=900&h=1100&fit=crop&q=80" },
  { key: "road-trip", title: "Road trips", subtitle: "Windows down, no plan", tags: ["travel"], image: "https://images.unsplash.com/photo-1749961347714-7d1bbb4b30b7?w=900&h=1100&fit=crop&q=80" },
  { key: "gaming", title: "Couch co-op gaming", subtitle: "One more round", tags: ["gaming"], image: "https://images.unsplash.com/photo-1774105416183-5058512ec5f0?w=900&h=1100&fit=crop&q=80" },
  { key: "stand-up", title: "Stand-up comedy", subtitle: "Open mics on a Tuesday", tags: ["comedy"], image: "https://images.unsplash.com/photo-1749988674009-515a57954bc2?w=900&h=1100&fit=crop&q=80" },
];

// Product photos for the demo brands' UGC cards, by the seeded brand handle.
export const BRAND_IMAGES: Record<string, string> = {
  "seed:volt": "https://images.unsplash.com/photo-1670172072742-d87fdc876ff8?w=900&h=1100&fit=crop&q=80",
  "seed:glowlab": "https://images.unsplash.com/photo-1741896135512-084b251887f7?w=900&h=1100&fit=crop&q=80",
  "seed:campusbites": "https://images.unsplash.com/photo-1771142673079-0b7608350892?w=900&h=1100&fit=crop&q=80",
  "seed:studypal": "https://images.unsplash.com/photo-1743862558369-5dcea79ccbff?w=900&h=1100&fit=crop&q=80",
  "seed:threadbare": "https://images.unsplash.com/photo-1580911035415-73036934b4e0?w=900&h=1100&fit=crop&q=80",
  "seed:loopbeats": "https://images.unsplash.com/photo-1505740106531-4243f3831c78?w=900&h=1100&fit=crop&q=80",
  "seed:pawpals": "https://images.unsplash.com/photo-1760615302725-4a6f097e56e0?w=900&h=1100&fit=crop&q=80",
  "seed:pixelarcade": "https://images.unsplash.com/photo-1774105416183-5058512ec5f0?w=900&h=1100&fit=crop&q=80",
};
