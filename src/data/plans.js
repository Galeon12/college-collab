// ─── Curriculum Plan Data ───────────────────────────────────────────────────
// Used by the interactive TrainingModule plan selector.

export const CURRICULUM_PLANS = {
  pinnacle: {
    key: 'pinnacle',
    label: 'Pinnacle',
    tagline: '2nd & 3rd Year Students',
    meta: 'B.Tech 2nd & 3rd year · 120 hrs across the semester · 3-4 classes a week',
    description: 'Build the problem-solving instinct early - before the placement season arrives.',
    phases: [
      {
        num: 1,
        title: 'Mastering the OA',
        tag: 'Foundation',
        items: [
          { title: 'DSA Deep Dive', bullets: ['Pattern-by-pattern coverage of every major data structure and algorithm.'], dropdownList: ['Arrays & Hashing', 'Two Pointers', 'Sliding Window', 'Stack & Queue', 'Binary Search', 'Linked List', 'Trees & BST', 'Tries', 'Heap / Priority Queue', 'Backtracking', 'Graphs', 'Advanced Graphs', '1-D Dynamic Programming', '2-D Dynamic Programming'] },
          { title: 'Competitive Programming', bullets: ['Structured profile-building on Codeforces.'] },
          { title: 'Weekly Problem Bunch', bullets: ['A problem bunch after every class followed by doubt sessions to concrete your concepts.'] },
          { title: 'Coding Round Simulations', bullets: ['Coding-round simulations every 2 weeks that mirror the coding rounds of top-tech companies.'] }
        ],
      },
      {
        num: 2,
        title: 'Dev, System Design & CS Fundamentals',
        tag: 'Build & Design',
        items: [
          { title: 'Full-stack Web Development', bullets: ['Git Essentials', 'Frontend', 'Backend', 'Cloud', 'Docker Containerization'] },
          { title: 'Capstone Project Development', bullets: ['Build and ship an end-to-end Capstone project on the MERN Stack'] },
          { title: 'System Design', bullets: ['HLD', 'LLD', 'SOLID Principles'] },
          { title: 'CS Fundamentals', bullets: ['OOPS', 'DBMS', 'Computer Networks'] }
        ],
      },
    ],
    addon: {
      label: '',
      items: [
        {
          title: 'Interview Mastery',
          bullets: [
            'Resume Makeover & LinkedIn Profile Optimization',
            'Interview preparation sessions to crack technical interviews',
            'Aptitude & soft skill sessions',
            'Company-specific PYQs for OA and interview',
            'Mock interviews with FAANG engineers, with detailed feedback'
          ]
        },
        {
          title: 'Hiring Pipeline Access',
          bullets: [
            'Direct referral pipeline into big-tech companies',
            'Talent Club access - requirements posted here before anywhere else',
            'AUHT - monthly AlgoUniversity Hiring Tournaments'
          ]
        },
        {
          title: 'Open Source Guidance',
          bullets: [
            "1:1 GSoC & C4GT mentorship by mentors who've been through the selection process themselves"
          ]
        }
      ],
    },
  },

  nexus: {
    key: 'nexus',
    label: 'Nexus',
    tagline: 'Final Year, All Students',
    meta: 'B.Tech 4th yr · M.Tech 2nd yr · MCA 2nd yr · 100 hrs over 2 months',
    description: 'End-to-end placement preparation - from OA cracking to offer negotiation.',
    phases: [
      {
        num: 1,
        title: 'Mastering the OA',
        tag: 'Foundation',
        items: [
          { title: 'Intensive DSA & CP', bullets: ['Pattern-by-pattern coverage of every major data structure and algorithm.'], dropdownList: ['Arrays & Hashing', 'Two Pointers', 'Sliding Window', 'Stack & Queue', 'Binary Search', 'Linked List', 'Trees & BST', 'Tries', 'Heap / Priority Queue', 'Backtracking', 'Graphs', 'Advanced Graphs', '1-D Dynamic Programming', '2-D Dynamic Programming'] },
          { title: '80-problem AlgoPath Capsule', bullets: ['Curated, structured problem set timed for placement season.'] },
          { title: 'Weekly Problem Bunch', bullets: ['A problem bunch after every class followed by doubt sessions to concrete your concepts.'] },
          { title: 'Coding Round Simulations', bullets: ['Coding-round simulations every 2 weeks that mirror the coding rounds of top-tech companies.'] }
        ],
      },
      {
        num: 2,
        title: 'Dev, System Design & CS Fundamentals',
        tag: 'Build & Design',
        items: [
          { title: 'Full-stack Web Development', bullets: ['Git Essentials', 'Frontend', 'Backend', 'Cloud', 'Docker Containerization'] },
          { title: 'Capstone Project Development', bullets: ['Build and ship an end-to-end Capstone project on the MERN Stack'] },
          { title: 'System Design', bullets: ['HLD', 'LLD', 'SOLID Principles'] },
          { title: 'CS Fundamentals', bullets: ['OOPS', 'DBMS', 'Computer Networks'] }
        ],
      },
      {
        num: 3,
        title: 'Interview Mastery & Placement',
        tag: 'Placement',
        items: [
          {
            title: 'Interview Mastery',
            bullets: [
              'Resume Makeover & LinkedIn Profile Optimization',
              'Interview preparation sessions to crack technical interviews',
              'Aptitude & soft skill sessions',
              'Company-specific PYQs for OA and interview',
              'Mock interviews with FAANG engineers, with detailed feedback'
            ]
          },
          {
            title: 'Hiring Pipeline Access',
            bullets: [
              'Direct referral pipeline into big-tech companies',
              'Talent Club access - requirements posted here before anywhere else',
              'AUHT - monthly AlgoUniversity Hiring Tournaments'
            ]
          }
        ],
      },
    ],
  },

  apex: {
    key: 'apex',
    label: 'Apex',
    tagline: 'Top 10% · Tier-0 & Tier-1 Target',
    meta: 'Top 10% of 3rd year & final year · targeting ₹70 LPA - ₹1 Cr+ packages',
    description: 'For the top 10% targeting FAANG, quant firms, and unicorns.',
    phases: [
      {
        num: 1,
        title: 'Mastering the OA',
        tag: 'Foundation',
        items: [
          { title: 'Advanced DSA & Competitive Programming', bullets: ['Codeforces profile building - the language top companies speak.'], dropdownList: ['Arrays & Hashing', 'Two Pointers', 'Sliding Window', 'Stack & Queue', 'Binary Search', 'Linked List', 'Trees & BST', 'Tries', 'Heap / Priority Queue', 'Backtracking', 'Graphs', 'Advanced Graphs', '1-D Dynamic Programming', '2-D Dynamic Programming'] },
          { title: 'AI Engineer Fundamentals', bullets: ['Core ML/AI concepts for roles at AI-first companies.'] },
          { title: '80-problem AlgoPath + Extensions', bullets: ['Full capsule plus hard/expert-level extension problems.'] },
          { title: 'Weekly Problem Bunch', bullets: ['A problem bunch after every class followed by doubt sessions to concrete your concepts.'] },
          { title: 'Coding Round Simulations', bullets: ['Coding-round simulations every 2 weeks that mirror the coding rounds of top-tech companies.'] }
        ],
      },
      {
        num: 2,
        title: 'Dev, System Design & CS Fundamentals',
        tag: 'Build & Design',
        items: [
          { title: 'Full-stack Web Development', bullets: ['Git Essentials', 'Frontend', 'Backend', 'Cloud', 'Docker Containerization'] },
          { title: 'Capstone Project Development', bullets: ['Build and ship an end-to-end Capstone project on the MERN Stack'] },
          { title: 'System Design', bullets: ['HLD', 'LLD', 'SOLID Principles'] },
          { title: 'CS Fundamentals', bullets: ['OOPS', 'DBMS', 'Computer Networks'] }
        ],
      },
      {
        num: 3,
        title: 'Elite Placement Support',
        tag: 'Placement',
        items: [
          {
            title: 'Interview Mastery',
            bullets: [
              'Direct mentorship from AlgoUniversity founders',
              'Resume Makeover & LinkedIn Profile Optimization',
              'Company-specific PYQs for OA and interviews'
            ]
          },
          {
            title: 'Hiring Pipeline Access',
            bullets: [
              'Direct referral pipeline into big-tech companies',
              'Premium Talent Club access',
              'Fast-tracked toward packages of ₹70 LPA to ₹1 Cr+'
            ]
          }
        ],
      },
    ],
  },
};

export const PLAN_KEYS = ['pinnacle', 'nexus', 'apex'];
