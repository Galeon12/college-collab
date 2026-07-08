// ─── Curriculum Plan Data ───────────────────────────────────────────────────
// Used by the interactive TrainingModule plan selector.

export const CURRICULUM_PLANS = {
  pinnacle: {
    key: 'pinnacle',
    label: 'Pinnacle',
    tagline: '1st – 3rd Year Students',
    meta: 'B.Tech 1st, 2nd & 3rd year · 120 hrs across the semester · 3–4 classes a week',
    description: 'Build the problem-solving instinct early — before the placement season arrives.',
    phases: [
      {
        num: 1,
        title: 'Mastering the OA & AI Fundamentals',
        tag: 'Foundation',
        items: [
          { title: 'Intensive DSA & CP', desc: 'Pattern-by-pattern coverage of every major data structure and algorithm.' },
          { title: 'AI Engineer Fundamentals', desc: 'Core ML/AI concepts that top companies now test in OAs.' },
          { title: '80-problem AlgoPath Capsule', desc: 'Curated, structured problem set — not random LeetCode grinding.' },
        ],
      },
      {
        num: 2,
        title: 'Dev, System Design & CS Fundamentals',
        tag: 'Build & Design',
        items: [
          { title: 'Full-stack Production Project', desc: 'End-to-end MERN app, shipped and live on GitHub.' },
          { title: 'HLD / LLD + SOLID', desc: 'High & Low Level Design principles with real-world case studies.' },
          { title: 'OOPS, DBMS & Computer Networks', desc: 'The CS fundamentals companies still interview hard on.' },
        ],
      },
    ],
    addon: {
      label: '+ Optional Add-ons — early taste of Placement Support',
      items: [
        'Resume Makeover & LinkedIn Optimisation',
        '1:1 GSoC & C4GT open-source mentorship',
        'Talent Club access — jobs posted here first',
      ],
    },
  },

  nexus: {
    key: 'nexus',
    label: 'Nexus',
    tagline: 'Final Year, All Students',
    meta: 'B.Tech 4th yr · M.Tech 2nd yr · MCA 2nd yr · 100 hrs over 2 months',
    description: 'End-to-end placement preparation — from OA cracking to offer negotiation.',
    phases: [
      {
        num: 1,
        title: 'Mastering the OA & Fundamentals',
        tag: 'Foundation',
        items: [
          { title: 'Intensive DSA & CP', desc: 'Pattern-by-pattern coverage of every major data structure and algorithm.' },
          { title: '80-problem AlgoPath Capsule', desc: 'Curated, structured problem set timed for placement season.' },
        ],
      },
      {
        num: 2,
        title: 'Dev, System Design & CS Fundamentals',
        tag: 'Build & Design',
        items: [
          { title: 'Full-stack Production Project', desc: 'End-to-end MERN app — your portfolio centrepiece.' },
          { title: 'HLD / LLD + SOLID Principles', desc: 'System design for SDE-2 interviews, taught at SDE-1 stage.' },
          { title: 'OOPS, DBMS & Computer Networks', desc: 'Core CS concepts — still heavily tested across the board.' },
        ],
      },
      {
        num: 3,
        title: 'Interview Mastery & Placement',
        tag: 'Placement',
        items: [
          { title: 'Resume Makeover & LinkedIn Optimisation', desc: 'Profiles rebuilt by engineers who screen resumes daily.' },
          { title: 'Mock Interviews with FAANG Engineers', desc: 'Detailed feedback after every session — not just a score.' },
          { title: 'Company PYQs + Aptitude & Soft Skills', desc: 'Company-specific OA and interview question banks.' },
          { title: 'Direct Referral Pipeline & Talent Club', desc: 'Jobs posted to our 1300+ HR & CXO network first.' },
        ],
      },
    ],
  },

  apex: {
    key: 'apex',
    label: 'Apex',
    tagline: 'Top 10% · Tier-0 & Tier-1 Target',
    meta: 'Top 10% of 3rd year & final year · targeting ₹70 LPA – ₹1 Cr+ packages',
    description: 'For the top 10% targeting FAANG, quant firms, and unicorns.',
    phases: [
      {
        num: 1,
        title: 'Mastering the OA & AI Fundamentals',
        tag: 'Foundation',
        items: [
          { title: 'Advanced DSA & Competitive Programming', desc: 'Codeforces profile building — the language top companies speak.' },
          { title: 'AI Engineer Fundamentals', desc: 'Core ML/AI concepts for roles at AI-first companies.' },
          { title: '80-problem AlgoPath + Extensions', desc: 'Full capsule plus hard/expert-level extension problems.' },
        ],
      },
      {
        num: 2,
        title: 'Dev, System Design & CS Fundamentals',
        tag: 'Build & Design',
        items: [
          { title: 'Industry-Level Project', desc: 'Built and shipped end-to-end — architecture that impresses.' },
          { title: 'HLD / LLD + SOLID Principles', desc: 'System design taught at the level Tier-0 companies actually probe.' },
          { title: 'OOPS, DBMS & Computer Networks', desc: 'Deep-dive CS fundamentals — no surface-level coverage.' },
        ],
      },
      {
        num: 3,
        title: 'Elite Placement Support',
        tag: 'Placement',
        items: [
          { title: 'Direct Mentorship from AU Founders', desc: 'The founders personally mentor Apex students through interview prep.' },
          { title: 'Resume & LinkedIn — Tier-0 Standard', desc: 'Rebuilt to match what FAANG recruiters specifically look for.' },
          { title: 'Company PYQs for OA & Interviews', desc: 'Google, Microsoft, Uber, Goldman — full question bank access.' },
          { title: 'Premium Talent Club + Direct Referrals', desc: 'Fast-tracked toward ₹70 LPA to ₹1 Cr+ packages.' },
        ],
      },
    ],
  },
};

export const PLAN_KEYS = ['pinnacle', 'nexus', 'apex'];
