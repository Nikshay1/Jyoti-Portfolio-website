// Everything the site says lives here. Facts come from Jyoti's resume
// (October 2026); don't add results that aren't on it.

// Jyoti hasn't decided yet whether to name her employers and clients
// publicly. While this is false, the site uses neutral descriptions and
// hides the resume download (the resume names them).
export const SHOW_CLIENT_NAMES = false;

const named = (real: string, neutral: string) =>
  SHOW_CLIENT_NAMES ? real : neutral;

export const person = {
  name: "Jyoti Chauhan",
  first: "Jyoti",
  last: "Chauhan",
  role: "Content writer",
  focus: "SEO blogs, website copy, landing pages",
  city: "Delhi, India",
  email: "jc4108034@gmail.com",
  availability: "Open to new work",
  resume: SHOW_CLIENT_NAMES ? "/Jyoti-Chauhan-Resume.pdf" : null,
};

export const seo = {
  title: "Jyoti Chauhan, Content Writer for SEO, Web & Marketing",
  description:
    "Jyoti Chauhan is a Delhi-based content writer. She writes SEO blogs, website copy, course pages and landing pages that rank on Google and show up in AI answers.",
};

export const intro = {
  query: "content writer who actually ranks",
  overview:
    "Jyoti Chauhan is a content writer based in Delhi. She writes SEO blogs, website copy and landing pages. One of her course pages ranks #2 on Google, and one of her blogs was the top answer in Google's AI Mode.",
  resultTitle: "Jyoti Chauhan: Content Writer for SEO, Web & Marketing",
  resultSnippet:
    "SEO blogs, website copy and landing pages that get found, get read, and get clicks. Based in Delhi.",
};

export const hero = {
  lead: "I write pages that get found on Google and show up in AI answers,",
  accent: "and still sound like a person wrote them.",
};

export const rewrite = {
  before:
    "We provide high-quality, SEO-optimized content solutions tailored to all of your business needs.",
  after:
    "I write the page people search for, and the one they actually finish reading.",
};

export type Work = {
  title: string;
  org: string;
  type: string;
  year: string;
  result: string;
  note: string;
  href?: string;
};

const aiios = named("AIIOS", "Occult science institute");

export const work: Work[] = [
  {
    title: named("BIVS website", "Institute website"),
    org: named("Bhartiya Institute of Vedic Science", "Vedic science institute"),
    type: "Website copy",
    year: "2026",
    result: "63K impressions in 16 days",
    note: "Wrote every page of the site. Clicks grew about 10% month on month.",
  },
  {
    title: "Palmistry course page",
    org: aiios,
    type: "SEO course page",
    year: "2026",
    result: "#2 on Google",
    note: "Ranks second on Google for “palmistry course”.",
  },
  {
    title: "Love & Marriage astrology blog",
    org: aiios,
    type: "Blog",
    year: "2026",
    result: "#1 in AI Mode",
    note: "The top answer in Google's AI Mode for its topic.",
  },
  {
    title: "Astrology & graphology webinars",
    org: aiios,
    type: "Landing pages",
    year: "2026",
    result: "40–50% lower cost per purchase",
    note: "Rewrote the webinar landing pages that sell the seats.",
  },
  {
    title: "SEO blogs & articles",
    org: aiios,
    type: "Blogs & articles",
    year: "2026",
    result: "83K+ impressions",
    note: "780+ clicks across astrology, numerology, palmistry and Reiki.",
  },
  {
    title: "Email & WhatsApp campaigns",
    org: aiios,
    type: "Marketing copy",
    year: "2026",
    result: "Webinars, courses, community",
    note: "Emails, WhatsApp messages and community posts for launches.",
  },
  {
    title: "Real estate blogs & social",
    org: named("DhanBhumi", "Real estate company"),
    type: "Blogs & social",
    year: "2025–26",
    result: "Blogs, reels, LinkedIn",
    note: "Blogs, website copy, Instagram reels and LinkedIn posts.",
  },
];

export const results = [
  { count: 83, prefix: "", suffix: "K+", label: "impressions from SEO content I wrote" },
  { count: 780, prefix: "", suffix: "+", label: "clicks from that same content" },
  { count: 2, prefix: "#", suffix: "", label: "on Google for “palmistry course”" },
  { count: 1, prefix: "#", suffix: "", label: "in Google AI Mode for an astrology blog" },
  { count: null, prefix: "40–50", suffix: "%", label: "lower cost per purchase on webinar pages" },
  { count: 150, prefix: "", suffix: "+", label: "students I taught spoken English" },
];

export const about = {
  paragraphs: [
    "I'm Jyoti. I write SEO blogs, website and course pages, landing pages, and the emails and WhatsApp messages that go out with them.",
    "Before writing full time, I taught spoken English to more than 150 students. That's where I learned to explain things simply, and it's still how I write: research first, plain words, one idea at a time.",
  ],
  services: [
    "SEO blogs & articles",
    "Website & course pages",
    "Landing pages",
    "Emails & WhatsApp copy",
    "Social media content",
    "Content audits & competitor research",
  ],
  experience: [
    { role: "Content Writer, SEO & Marketing", org: aiios, years: "2026–now" },
    {
      role: "Social Media & Content Executive",
      org: named("DhanBhumi", "Real estate company"),
      years: "2025–26",
    },
    {
      role: "Business Development & English Trainer",
      org: named("Training YA Institute", "Training institute"),
      years: "2025",
    },
    {
      role: "English Teacher",
      org: named("Lal Bahadur Shastri Training Institute", "Training institute"),
      years: "2023–25",
    },
    {
      role: "Teacher, Science & Nursery",
      org: named("Maya Goel Vidya Niketan", "School"),
      years: "2022–23",
    },
  ],
  education: "B.Sc. Biochemistry, IGNOU (2022–2026)",
};
