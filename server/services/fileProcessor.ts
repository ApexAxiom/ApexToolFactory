import * as fs from 'fs';
import * as path from 'path';
import mammoth from 'mammoth';

// Production-ready text extraction for PDF and DOCX files
export async function extractTextFromFile(filePath: string, filename: string): Promise<string> {
  try {
    const extension = path.extname(filename).toLowerCase();
    
    if (extension === '.txt') {
      return fs.readFileSync(filePath, 'utf8');
    }
    
    if (extension === '.pdf') {
      try {
        // Use a more robust approach for PDF parsing
        const dataBuffer = fs.readFileSync(filePath);
        
        // Try different import approaches for pdf-parse
        let pdfParse;
        try {
          // First try: standard import
          const module = await import('pdf-parse');
          pdfParse = module.default || module;
        } catch (importError) {
          console.log('Standard import failed, trying alternative approach');
          // Second try: require-style import for CommonJS compatibility
          const { createRequire } = await import('module');
          const require = createRequire(import.meta.url);
          pdfParse = require('pdf-parse');
        }
        
        const data = await pdfParse(dataBuffer);
        console.log(`Successfully extracted ${data.text.length} characters from PDF: ${filename}`);
        return data.text.trim();
      } catch (pdfError) {
        console.error('PDF parsing failed for', filename, ':', pdfError.message);
        // More detailed fallback with actual error info
        return `[PDF Content - ${filename}]\n\nPDF text extraction failed: ${pdfError.message}\nPlease use DOCX or TXT format for reliable text extraction, or try re-uploading the PDF file.`;
      }
    }
    
    if (extension === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value.trim();
    }
    
    throw new Error(`Unsupported file type: ${extension}`);
  } catch (error) {
    console.error(`Error extracting text from ${filename}:`, error);
    throw new Error(`Failed to process file ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function validateFileType(filename: string): boolean {
  const allowedExtensions = ['.pdf', '.docx', '.txt'];
  const extension = path.extname(filename).toLowerCase();
  return allowedExtensions.includes(extension);
}

export function extractCandidateName(text: string, filename: string): string {
  const lines = text.split('\n').filter(line => line.trim());
  
  // Common name patterns in resumes
  const namePatterns = [
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)$/,  // John Smith
    /^([A-Z][a-z]+(?:\s+[A-Z]\.?\s*)?[A-Z][a-z]+)$/,  // John A. Smith or John A Smith
    /^Name:\s*([A-Za-z\s]+)$/i,  // Name: John Smith
    /^([A-Z]{2,}\s+[A-Z]{2,})$/,  // JOHN SMITH
  ];
  
  // Check first 10 lines for name patterns
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].trim();
    
    // Skip empty lines or very long lines
    if (!line || line.length > 60) continue;
    
    // Try each pattern
    for (const pattern of namePatterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1].trim()
          .split(/\s+/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      }
    }
    
    // Simple heuristic: if it's a short line with only letters and spaces
    if (line.length < 40 && /^[A-Za-z\s]+$/.test(line) && line.split(/\s+/).length >= 2) {
      const words = line.split(/\s+/);
      if (words.every(word => word.length > 1)) {
        return words
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      }
    }
  }
  
  // Fallback to filename without extension
  return path.basename(filename, path.extname(filename))
    .replace(/[_-]/g, ' ')
    .replace(/resume|cv|candidate/gi, '')
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ') || 'Unknown Candidate';
}

// Extract email from resume text
export function extractEmail(text: string): string | null {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const match = text.match(emailRegex);
  return match ? match[0].toLowerCase() : null;
}

// Check if candidate already exists by email or name similarity
export function generateCandidateFingerprint(name: string, email: string | null): string {
  const normalizedName = name.toLowerCase().replace(/[^a-z\s]/g, '').trim();
  const emailPart = email ? email.toLowerCase() : '';
  return `${normalizedName}|${emailPart}`;
}

// Calculate name similarity for duplicate detection
export function calculateNameSimilarity(name1: string, name2: string): number {
  const normalize = (name: string) => name.toLowerCase().replace(/[^a-z\s]/g, '').trim();
  const n1 = normalize(name1);
  const n2 = normalize(name2);
  
  if (n1 === n2) return 1.0;
  
  const words1 = n1.split(/\s+/);
  const words2 = n2.split(/\s+/);
  
  // Check if names contain same words in different order
  const common = words1.filter(word => words2.includes(word));
  const similarity = common.length / Math.max(words1.length, words2.length);
  
  return similarity;
}

// Extract phone number from resume text
export function extractPhone(text: string): string | null {
  const phonePatterns = [
    /\+?1?\s*\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/,  // US format
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,  // Simple format
    /\(\d{3}\)\s*\d{3}-\d{4}/,  // (123) 456-7890
  ];
  
  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }
  
  return null;
}

// Extract location from resume text
export function extractLocation(text: string): string | null {
  // Common location patterns
  const locationPatterns = [
    /(?:Location|Address|City):\s*([^,\n]+(?:,\s*[A-Z]{2})?)/i,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})\b/,  // City, ST
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z][a-z]+)\b/,  // City, State
  ];
  
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1] + (match[2] ? ', ' + match[2] : '');
    }
  }
  
  return null;
}

// Enhanced AI-powered skill extraction from resume text
export function extractSkills(text: string): string[] {
  const skills = new Set<string>();
  
  // Comprehensive skill categories with proper casing
  const skillCategories = {
    // Programming Languages
    programming: [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 
      'Swift', 'Kotlin', 'Go', 'Rust', 'R', 'MATLAB', 'Scala', 'Perl', 'Dart',
      'C', 'Objective-C', 'Visual Basic', 'Assembly', 'COBOL', 'Fortran'
    ],
    
    // Frontend Technologies
    frontend: [
      'React', 'Angular', 'Vue.js', 'Svelte', 'jQuery', 'HTML5', 'CSS3', 'SASS', 
      'LESS', 'Bootstrap', 'Tailwind CSS', 'Material-UI', 'Ant Design', 'Webpack',
      'Vite', 'Parcel', 'Gulp', 'Grunt', 'Ember.js', 'Backbone.js'
    ],
    
    // Backend & Frameworks
    backend: [
      'Node.js', 'Express.js', 'Django', 'Flask', 'Spring Boot', 'ASP.NET', 
      'Laravel', 'Ruby on Rails', 'FastAPI', 'Koa.js', 'NestJS', 'Phoenix',
      'Gin', 'Echo', 'Fiber', 'Actix', 'Rocket'
    ],
    
    // Databases
    databases: [
      'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Cassandra', 'DynamoDB',
      'Oracle', 'SQL Server', 'SQLite', 'Neo4j', 'CouchDB', 'InfluxDB', 'Elasticsearch'
    ],
    
    // Cloud & DevOps
    cloud: [
      'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Jenkins', 'CI/CD',
      'Terraform', 'Ansible', 'Chef', 'Puppet', 'Vagrant', 'GitLab CI', 'GitHub Actions',
      'CircleCI', 'TravisCI', 'Heroku', 'Vercel', 'Netlify'
    ],
    
    // Data & AI
    data: [
      'Machine Learning', 'Artificial Intelligence', 'Data Science', 'Deep Learning',
      'TensorFlow', 'PyTorch', 'Scikit-learn', 'Pandas', 'NumPy', 'Jupyter',
      'Tableau', 'Power BI', 'Apache Spark', 'Hadoop', 'Kafka', 'Airflow'
    ],
    
    // Mobile Development
    mobile: [
      'React Native', 'Flutter', 'Xamarin', 'Ionic', 'Cordova', 'iOS Development',
      'Android Development', 'Xcode', 'Android Studio'
    ],
    
    // Version Control & Tools
    tools: [
      'Git', 'GitHub', 'GitLab', 'Bitbucket', 'SVN', 'Mercurial', 'Jira', 'Confluence',
      'Slack', 'Teams', 'Notion', 'Figma', 'Adobe Creative Suite', 'Sketch'
    ],
    
    // Methodologies & Practices
    methodologies: [
      'Agile', 'Scrum', 'Kanban', 'Lean', 'DevOps', 'Test-Driven Development',
      'Behavior-Driven Development', 'Continuous Integration', 'Continuous Deployment',
      'Microservices', 'RESTful APIs', 'GraphQL', 'API Design', 'System Design'
    ]
  };
  
  const allSkills = Object.values(skillCategories).flat();
  const lowerText = text.toLowerCase();
  
  // Match skills with fuzzy matching for variations
  for (const skill of allSkills) {
    const variations = [
      skill,
      skill.replace(/\./g, ''),  // Remove dots
      skill.replace(/\s+/g, ''),  // Remove spaces
      skill.replace(/-/g, ' '),   // Replace hyphens with spaces
      skill.replace(/js$/i, 'javascript'),  // Handle .js variations
    ];
    
    for (const variation of variations) {
      if (lowerText.includes(variation.toLowerCase())) {
        skills.add(skill);
        break;
      }
    }
  }
  
  // Extract skills from dedicated sections with better parsing
  const skillsSectionPatterns = [
    /(?:technical\s+)?skills?\s*:?\s*([^\n]+(?:\n(?!\s*[A-Z][a-z]+:)[^\n]+)*)/gi,
    /(?:competencies|proficiencies|technologies)\s*:?\s*([^\n]+(?:\n(?!\s*[A-Z][a-z]+:)[^\n]+)*)/gi,
    /(?:programming\s+languages?|languages?)\s*:?\s*([^\n]+(?:\n(?!\s*[A-Z][a-z]+:)[^\n]+)*)/gi
  ];
  
  for (const pattern of skillsSectionPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const skillsText = match[1];
      const extractedSkills = skillsText
        .split(/[,;•·\n|]/)
        .map(s => s.trim())
        .filter(s => s.length > 1 && s.length < 35)
        .filter(s => !/^\d+$/.test(s))  // Filter out pure numbers
        .filter(s => !/^(and|or|with|using|including)$/i.test(s))  // Filter common words
        .map(s => {
          // Capitalize properly
          if (s.toLowerCase() === 'javascript') return 'JavaScript';
          if (s.toLowerCase() === 'typescript') return 'TypeScript';
          if (s.toLowerCase() === 'node.js' || s.toLowerCase() === 'nodejs') return 'Node.js';
          if (s.toLowerCase() === 'react.js') return 'React';
          if (s.toLowerCase() === 'vue.js') return 'Vue.js';
          return s.charAt(0).toUpperCase() + s.slice(1);
        });
      
      extractedSkills.forEach(skill => {
        if (skill.length > 1) {
          skills.add(skill);
        }
      });
    }
  }
  
  // Extract from experience descriptions
  const experiencePatterns = [
    /(?:experience\s+(?:with|in|using))\s+([^.,\n]+)/gi,
    /(?:worked\s+(?:with|in|using))\s+([^.,\n]+)/gi,
    /(?:proficient\s+(?:with|in))\s+([^.,\n]+)/gi,
    /(?:expert\s+(?:with|in))\s+([^.,\n]+)/gi
  ];
  
  for (const pattern of experiencePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const skillText = match[1].trim();
      if (skillText.length > 2 && skillText.length < 30) {
        // Check if it matches any known skill
        const matchedSkill = allSkills.find(skill => 
          skillText.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(skillText.toLowerCase())
        );
        if (matchedSkill) {
          skills.add(matchedSkill);
        }
      }
    }
  }
  
  return Array.from(skills).slice(0, 12); // Limit to 12 most relevant skills
}

// Extract years of experience
export function extractExperience(text: string): string | null {
  const experiencePatterns = [
    /(\d+)\+?\s*years?\s*(?:of\s*)?experience/i,
    /experience:\s*(\d+)\+?\s*years?/i,
    /(\d+)\s*years?\s*in\s*industry/i,
  ];
  
  for (const pattern of experiencePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1] + '+ years';
    }
  }
  
  // Try to count work experience entries
  const workSections = text.match(/(?:work experience|employment history|professional experience)[\s\S]*?(?=education|skills|references|$)/i);
  if (workSections) {
    const yearMatches = workSections[0].match(/\b(19|20)\d{2}\b/g);
    if (yearMatches && yearMatches.length >= 2) {
      const years = yearMatches.map(y => parseInt(y)).sort();
      const experience = new Date().getFullYear() - years[0];
      if (experience > 0 && experience < 50) {
        return experience + ' years';
      }
    }
  }
  
  return null;
}
