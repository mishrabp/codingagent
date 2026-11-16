import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL_NAME = 'google/gemma-4-31b-it:free';

async function fetchModelResponse(body: Record<string, unknown>) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OpenRouter API key is missing. Check your .env configuration.');
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Bibhup Mishra Digital Twin',
    },
    body: JSON.stringify(body),
  });

  return response;
}

function buildFallbackAnswer(question: string): string {
  const q = question.toLowerCase();

  if (q.includes('azure') || q.includes('cloud') || q.includes('focus')) {
    return 'Bibhup Mishra is known for driving cloud transformation with Azure-first architecture, Kubernetes modernization, and secure platform engineering. His work centers on migrating complex enterprise and Microsoft digital platforms to Azure, improving scalability, reliability, cost efficiency, and operational maturity.';
  }

  if (q.includes('ltimindtree') || q.includes('microsoft.com') || q.includes('current') || q.includes('role')) {
    return 'At LTIMindtree, he serves as Principal Architect — Cloud Engineering, leading the modernization of Microsoft.com properties to Azure Kubernetes Service. He focuses on secure architecture, cloud migration strategy, automation, monitoring, and mentoring engineering teams to deliver enterprise-scale transformation.';
  }

  if (q.includes('devops') || q.includes('kubernetes') || q.includes('aks')) {
    return 'His experience spans Azure DevOps, AKS, Terraform, cloud automation, monitoring, and platform governance. He has helped organizations scale DevOps maturity, reduce operational friction, and move from fragmented legacy systems to resilient, highly automated platforms.';
  }

  if (q.includes('leadership') || q.includes('value') || q.includes('strength') || q.includes('why')) {
    return 'What makes Bibhup valuable is the combination of technical depth and leadership. He can translate business goals into architecture, lead enterprise modernization programs, build trusted stakeholder relationships, and help development and SRE teams execute with confidence.';
  }

  if (q.includes('healthcare') || q.includes('emr') || q.includes('hospital')) {
    return 'He has worked across healthcare technology initiatives, including EMR and hospital integration programs. That background gave him experience in regulated environments, system interoperability, and enterprise platforms that must balance performance, compliance, and reliability.';
  }

  if (q.includes('portfolio') || q.includes('case') || q.includes('project')) {
    return 'His portfolio is being curated and expanded. The current profile highlights his core strengths across Azure migration, Kubernetes, DevOps transformation, and enterprise architecture, and the portfolio section is positioned to showcase deeper case studies as they are prepared.';
  }

  return 'Bibhup Mishra is a Principal Cloud and DevOps Architect with 18+ years of experience in software development and enterprise architecture. He specializes in Azure, Kubernetes, DevOps, and digital transformation, with a track record of modernizing large-scale websites and enterprise platforms while mentoring teams and improving operational efficiency.';
}

export async function POST(request: NextRequest) {
  let userQuestion = '';

  try {
    const { question } = await request.json();

    if (!question || typeof question !== 'string' || !question.trim()) {
      return NextResponse.json({ error: 'A valid question is required.' }, { status: 400 });
    }

    userQuestion = question.trim();

    const systemPrompt = `You are the digital twin of Bibhup Mishra, a Principal Cloud and DevOps Architect. Answer questions about his career, experience, strengths, leadership, technology focus, and professional journey.

Your knowledge is grounded in the following profile:
- 18+ years in software development and architecture
- Principal Architect at LTIMindtree specializing in Azure, Kubernetes, and cloud engineering
- Leadership in Microsoft.com modernization to Azure Kubernetes Service
- Strong delivery in Azure cloud migration, DevOps, security, and enterprise-scale architecture
- Experience across major roles at LTIMindtree, NTT DATA Services, Dell Services, Satyam, and Infosys
- Built and modernized healthcare, Microsoft, and enterprise platforms
- Deep focus on Azure, AKS, Terraform, Azure DevOps, monitoring with App Insights, Prometheus, Grafana
- DevOps culture transformation across 67 projects
- Health IT experience with EMR, integration, and enterprise systems
- Certified in PSM I, PG in Generative AI and ML, and PMP

Style: concise, credible, professional, and warm. Answer as if speaking for Bibhup, while staying factual and grounded. If asked about future portfolio or unavailable details, say that portfolio case studies are being curated and that the profile reflects his current experience.`;

    const requestPayload = {
      model: MODEL_NAME,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userQuestion },
      ],
      temperature: 0.7,
      max_tokens: 500,
      provider: { allow_fallbacks: true },
    };

    let response;
    let lastErrorText = '';

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        response = await fetchModelResponse(requestPayload);
        if (response.ok) {
          break;
        }

        const text = await response.text();
        lastErrorText = text;

        if (response.status !== 429 || attempt === 3) {
          const fallbackAnswer = buildFallbackAnswer(userQuestion);
          return NextResponse.json({ answer: fallbackAnswer }, { status: 200 });
        }

        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      } catch (error) {
        if (attempt === 3) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      }
    }

    const data = await response!.json();
    const answer = data?.choices?.[0]?.message?.content;

    if (!answer || typeof answer !== 'string') {
      return NextResponse.json({ error: 'No response received from the model.' }, { status: 502 });
    }

    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Digital twin chat error:', error);
    return NextResponse.json({ answer: buildFallbackAnswer(userQuestion || 'career') }, { status: 200 });
  }
}
