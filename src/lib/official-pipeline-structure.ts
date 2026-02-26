export interface PipelineQuestion {
  id: string;
  text: string; // Short label for display
  fullQuestion: string; // Complete question text from the application form (English)
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'info' | 'number';
  options?: string[];
  helpText?: string;
  required?: boolean;
  wordLimit?: string; // e.g. "400-700 words" (legacy, use charLimit instead)
  charLimit?: number; // Character limit for text fields (e.g. 3000)
}

export interface PipelineSection {
  id: string;
  title: string;
  description?: string;
  questions: PipelineQuestion[];
}

export interface PipelineChapter {
  id: number;
  title: string;
  sections: PipelineSection[];
}

// Pipeline Structure - Dynamic based on Action Type
// Summary comes LAST so it can summarize all previously generated content
export const getOfficialPipelineStructure = (actionType: 'KA220' | 'KA210' = 'KA220', wpCount: number = 5): PipelineChapter[] => {
  if (actionType === 'KA210') {
    // KA210: Small-scale partnerships
    const activitySections: PipelineSection[] = [];

    for (let i = 1; i <= wpCount; i++) {
      activitySections.push({
        id: `act_list_wp${i}`,
        title: `Activity ${i}`,
        questions: [
          {
            id: `act_content_wp${i}`,
            text: 'Activity content',
            fullQuestion: 'Please describe the activity content, methodology and the expected target group(s).',
            type: 'textarea',
            required: true,
            wordLimit: '300-500 words'
          },
          {
            id: `act_objectives_wp${i}`,
            text: 'Contribution to objectives',
            fullQuestion: 'Please explain how this activity contributes to reaching the project objectives.',
            type: 'textarea',
            required: true,
            wordLimit: '200-400 words'
          },
          {
            id: `act_budget_wp${i}`,
            text: 'Budget allocation',
            fullQuestion: 'Please explain the rationale for the budget allocation of this activity.',
            type: 'textarea',
            required: true,
            wordLimit: '150-300 words'
          }
        ]
      });
    }

    return [
      // STEP 1: CONTEXT
      {
        id: 1,
        title: 'Context',
        sections: [
          {
            id: 'context_general',
            title: 'Project Context',
            questions: [
              { id: 'projectTitle', text: 'Project Title', fullQuestion: 'Please provide the full title of your project.', type: 'text', required: true, charLimit: 150 },
              { id: 'acronym', text: 'Project Acronym', fullQuestion: 'Please provide a short acronym for your project (max. 10 characters).', type: 'text', required: true, charLimit: 20 },
              { id: 'startDate', text: 'Project Start Date', fullQuestion: 'Please indicate the planned start date of your project (dd/mm/yyyy).', type: 'text', required: true, helpText: 'dd/mm/yyyy' },
              { id: 'duration', text: 'Project Duration', fullQuestion: 'Please select the total duration of your project.', type: 'select', options: ['6 months', '12 months', '18 months', '24 months'], required: true },
              { id: 'lumpSum', text: 'Lump Sum Amount', fullQuestion: 'Please select the lump sum amount you are applying for.', type: 'select', options: ['30.000 EUR', '60.000 EUR'], required: true },
              { id: 'nationalAgency', text: 'National Agency', fullQuestion: 'Please indicate the National Agency to which you are submitting this application.', type: 'text', required: true },
              { id: 'language', text: 'Language', fullQuestion: 'Please select the main language used in the application.', type: 'select', options: ['English', 'German', 'Romanian', 'Croatian'], required: true },
            ]
          }
        ]
      },
      // STEP 2: PARTICIPATING ORGANISATIONS
      {
        id: 2,
        title: 'Participating Organisations',
        sections: [
          {
            id: 'partner_intro',
            title: 'Background and Experience',
            questions: [
              {
                id: 'org_presentation',
                text: 'Brief presentation',
                fullQuestion: 'Please briefly present your organisation (e.g. its type, scope of work, areas of activity and if applicable, the approximate number of paid/unpaid staff, learners).',
                type: 'textarea',
                required: true,
                helpText: 'Describe type, scope of work, and activities.',
                wordLimit: '400-700 words'
              },
              {
                id: 'org_experience',
                text: 'Relevant experience',
                fullQuestion: 'What are the activities and experience of the organisation in the areas relevant for this project?',
                type: 'textarea',
                required: true,
                wordLimit: '400-700 words'
              },
              {
                id: 'cooperation_arrangements',
                text: 'Cooperation arrangements',
                fullQuestion: 'How did you form your partnership and how will the partners cooperate and communicate during the project?',
                type: 'textarea',
                required: true,
                helpText: 'How was the partnership formed and how will you work together?',
                wordLimit: '400-700 words'
              }
            ]
          }
        ]
      },
      // STEP 3: RELEVANCE
      {
        id: 3,
        title: 'Relevance',
        sections: [
          {
            id: 'priorities',
            title: 'Priorities and topics',
            questions: [
              {
                id: 'priority_main',
                text: 'Main priority',
                fullQuestion: 'Please select the most relevant horizontal or sectoral priority according to the objectives of your project.',
                type: 'select',
                options: ['Inclusion and diversity', 'Digital transformation', 'Environment and fight against climate change', 'Participation in democratic life'],
                required: true
              },
              {
                id: 'address_priorities',
                text: 'Addressing priorities',
                fullQuestion: 'Please explain how your project will address the selected priorities.',
                type: 'textarea',
                required: true,
                wordLimit: '500-800 words'
              },
              {
                id: 'topics',
                text: 'Topics addressed',
                fullQuestion: 'Please select the topics addressed by your project.',
                type: 'multiselect',
                options: ['Key Competences', 'Digital skills', 'Green skills', 'Social inclusion'],
                required: true
              }
            ]
          },
          {
            id: 'project_description',
            title: 'Project description',
            questions: [
              {
                id: 'objectives',
                text: 'Objectives',
                fullQuestion: 'What do you want to achieve by implementing the project?',
                type: 'textarea',
                required: true,
                wordLimit: '500-800 words'
              },
              {
                id: 'implementation',
                text: 'Implementation',
                fullQuestion: 'How are you going to implement the project? Please describe your approach, methodology and how different activities are interconnected.',
                type: 'textarea',
                required: true,
                wordLimit: '500-800 words'
              },
              {
                id: 'results',
                text: 'Expected results',
                fullQuestion: 'What are the expected results of the project? Please describe concrete outputs, products, or services that will be produced.',
                type: 'textarea',
                required: true,
                wordLimit: '400-700 words'
              }
            ]
          }
        ]
      },
      // STEP 4: ACTIVITIES
      {
        id: 4,
        title: 'Activities',
        sections: activitySections
      },
      // STEP 5: IMPACT
      {
        id: 5,
        title: 'Impact and Dissemination',
        sections: [
          {
            id: 'impact_general',
            title: 'Impact',
            questions: [
              {
                id: 'assessment',
                text: 'Assessment',
                fullQuestion: 'How will you assess the achievement of project objectives and the results produced? Please describe the evaluation indicators and methodology you will use.',
                type: 'textarea',
                required: true,
                wordLimit: '400-600 words'
              },
              {
                id: 'sustainability',
                text: 'Sustainability',
                fullQuestion: 'How will you ensure the sustainability of the project? What will happen with the results after the end of the EU funding?',
                type: 'textarea',
                required: true,
                wordLimit: '400-600 words'
              },
              {
                id: 'dissemination',
                text: 'Dissemination',
                fullQuestion: 'How do you plan to make the results of your project known within your partnership, in your local communities and in the wider public? Who are the main target groups of your dissemination activities?',
                type: 'textarea',
                required: true,
                wordLimit: '400-600 words'
              }
            ]
          }
        ]
      },
      // STEP 6: SUMMARY (LAST)
      {
        id: 6,
        title: 'Project Summary',
        sections: [
          {
            id: 'summary_content',
            title: 'Project Summary',
            questions: [
              {
                id: 'objectives_summary',
                text: 'Objectives Summary',
                fullQuestion: 'Please provide a short summary of the project objectives (this text will be publicly available if the project is funded).',
                type: 'textarea',
                required: true,
                wordLimit: '200-400 words'
              },
              {
                id: 'implementation_summary',
                text: 'Activities Summary',
                fullQuestion: 'Please provide a short summary of the main activities (this text will be publicly available if the project is funded).',
                type: 'textarea',
                required: true,
                wordLimit: '200-400 words'
              },
              {
                id: 'results_summary',
                text: 'Results Summary',
                fullQuestion: 'Please provide a short summary of the expected results (this text will be publicly available if the project is funded).',
                type: 'textarea',
                required: true,
                wordLimit: '200-400 words'
              }
            ]
          }
        ]
      }
    ];
  }

  // DEFAULT: KA220 Cooperation Partnerships
  const wpSections: PipelineSection[] = [
    {
      id: 'wp_management',
      title: 'WP1: Project Management',
      questions: [
        {
          id: 'monitoring_wp1',
          text: 'Monitoring & Quality',
          fullQuestion: 'How will the progress, quality and achievement of project activities be monitored? Please give information about the involved staff, as well as the timing and frequency of the monitoring activities.',
          type: 'textarea',
          required: true,
          charLimit: 3000
        },
        {
          id: 'budget_control_wp1',
          text: 'Budget & Time Management',
          fullQuestion: 'How will you ensure proper budget control and time management in your project?',
          type: 'textarea',
          required: true,
          charLimit: 3000
        },
        {
          id: 'risk_management_wp1',
          text: 'Risk Management',
          fullQuestion: 'What are your plans for handling risks for project implementation (e.g. delays, budget, conflicts, etc.)?',
          type: 'textarea',
          required: true,
          charLimit: 2000
        },
        {
          id: 'inclusion_design_wp1',
          text: 'Accessible & Inclusive Design',
          fullQuestion: 'How will you ensure that the activities are designed in an accessible and inclusive way?',
          type: 'textarea',
          required: true,
          charLimit: 3000
        },
        {
          id: 'digital_tools_wp1',
          text: 'Digital Tools & Learning',
          fullQuestion: 'How does the project incorporate the use of digital tools and learning methods to complement the physical activities and to improve cooperation between partner organisations?',
          type: 'textarea',
          required: true,
          charLimit: 3000
        },
        {
          id: 'green_practices_wp1',
          text: 'Green Practices',
          fullQuestion: 'How does the project incorporate green practices in different project phases?',
          type: 'textarea',
          required: true,
          charLimit: 3000
        },
        {
          id: 'civic_engagement_wp1',
          text: 'Civic Engagement',
          fullQuestion: 'How does the project encourage participation and civic engagement in different project phases?',
          type: 'textarea',
          required: true,
          charLimit: 3000
        }
      ]
    }
  ];

  for (let i = 2; i <= wpCount; i++) {
    wpSections.push({
      id: `wp_implementation_wp${i}`,
      title: i === wpCount ? `WP${i}: Dissemination & Exploitation` : `WP${i}: Implementation Phase ${i - 1}`,
      questions: [
        {
          id: `wp_objectives_wp${i}`,
          text: 'WP Objectives',
          fullQuestion: `What are the specific objectives of this work package and how do they contribute to the general objectives of the project?`,
          type: 'textarea',
          required: true,
          charLimit: 2000
        },
        {
          id: `wp_results_wp${i}`,
          text: 'WP Results',
          fullQuestion: `What will be the main results of this work package?`,
          type: 'textarea',
          required: true,
          charLimit: 2000
        },
        {
          id: `wp_indicators_wp${i}`,
          text: 'Indicators',
          fullQuestion: `What qualitative and quantitative indicators will you use to measure the level of the achievement of the work package objectives and the quality of the results?`,
          type: 'textarea',
          required: true,
          charLimit: 3000
        },
        {
          id: `wp_partners_wp${i}`,
          text: 'Partners Roles',
          fullQuestion: `Please describe the tasks and responsibilities of each partner organisation in the work package.`,
          type: 'textarea',
          required: true,
          charLimit: 2000
        },
        {
          id: `wp_budget_wp${i}`,
          text: 'Budget Rationale',
          fullQuestion: `Please explain how you define the amount dedicated to the work package and how the work package is cost-effective?`,
          type: 'textarea',
          required: true,
          charLimit: 5000
        }
      ]
    });

    // Add Activities section for each WP - 4 official EU questions covering ALL activities
    wpSections.push({
      id: `wp_activities_wp${i}`,
      title: `WP${i}: Description of Activities`,
      questions: [
        {
          id: `wp_act_content_wp${i}`,
          text: 'Activities: Content',
          fullQuestion: 'Describe the content of the proposed activities.',
          type: 'textarea' as const,
          required: true,
          charLimit: 3000
        },
        {
          id: `wp_act_objectives_wp${i}`,
          text: 'Activities: Objectives',
          fullQuestion: 'Explain how these activities are going to help reach the WP objectives.',
          type: 'textarea' as const,
          required: true,
          charLimit: 3000
        },
        {
          id: `wp_act_results_wp${i}`,
          text: 'Activities: Expected Results',
          fullQuestion: 'Describe the expected results of the activities.',
          type: 'textarea' as const,
          required: true,
          charLimit: 3000
        },
        {
          id: `wp_act_participants_wp${i}`,
          text: 'Activities: Participants',
          fullQuestion: 'Expected number and profile of participants.',
          type: 'textarea' as const,
          required: true,
          charLimit: 3000
        }
      ]
    });
  }

  return [
    // STEP 1: CONTEXT
    {
      id: 1,
      title: 'Context',
      sections: [
        {
          id: 'context_general',
          title: 'Project Context',
          questions: [
            { id: 'projectTitle', text: 'Project Title', fullQuestion: 'Please provide the full title of your project.', type: 'text', required: true, charLimit: 150 },
            { id: 'acronym', text: 'Project Acronym', fullQuestion: 'Please provide a short acronym for your project (max. 10 characters).', type: 'text', required: true, charLimit: 20 },
            { id: 'startDate', text: 'Project Start Date', fullQuestion: 'Please indicate the planned start date of your project (dd/mm/yyyy).', type: 'text', required: true, helpText: 'dd/mm/yyyy' },
            { id: 'duration', text: 'Project Duration', fullQuestion: 'Please select the total duration of your project.', type: 'select', options: ['12 months', '24 months', '36 months'], required: true },
            { id: 'nationalAgency', text: 'National Agency', fullQuestion: 'Please indicate the National Agency to which you are submitting this application.', type: 'text', required: true },
            { id: 'language', text: 'Language', fullQuestion: 'Please select the main language used in the application.', type: 'select', options: ['English', 'German', 'Romanian', 'Croatian'], required: true },
          ]
        }
      ]
    },
    // STEP 2: PARTICIPATING ORGANISATIONS
    {
      id: 2,
      title: 'Participating Organisations',
      sections: [
        {
          id: 'partner_intro',
          title: 'For each organisation',
          questions: [
            {
              id: 'org_presentation',
              text: 'Brief presentation',
              fullQuestion: 'Please briefly present your organisation (e.g. its type, scope of work, areas of activity and if applicable, the approximate number of paid/unpaid staff, learners).',
              type: 'textarea',
              required: true,
              helpText: 'Scope: 400-700 words.',
              wordLimit: '400-700 words'
            },
            {
              id: 'org_experience',
              text: 'Activities and experience',
              fullQuestion: 'What are the activities and experience of the organisation in the areas relevant for this project? What are the skills and/or expertise of key persons involved in this project?',
              type: 'textarea',
              required: true,
              helpText: 'Detail relevant skills and key persons.',
              wordLimit: '400-700 words'
            },
            {
              id: 'org_past_participation',
              text: 'Past participation',
              fullQuestion: 'Has your organisation participated in a European Union granted project in the 3 years preceding this application? If so, please specify the project reference(s).',
              type: 'textarea',
              required: false,
              wordLimit: '100-300 words'
            }
          ]
        }
      ]
    },
    // STEP 3: RELEVANCE
    {
      id: 3,
      title: 'Relevance of the Project',
      sections: [
        {
          id: 'priorities',
          title: 'Priorities and topics',
          questions: [
            {
              id: 'priority_main',
              text: 'Main priority',
              fullQuestion: 'Please select the most relevant horizontal or sectoral priority according to the objectives of your project.',
              type: 'select',
              options: ['Inclusion and diversity', 'Digital transformation', 'Environment and fight against climate change', 'Participation in democratic life'],
              required: true
            },
            {
              id: 'priority_others',
              text: 'Additional priorities',
              fullQuestion: 'Please select any additional horizontal or sectoral priorities addressed by your project.',
              type: 'multiselect',
              options: ['Inclusion and diversity', 'Digital transformation', 'Environment and fight against climate change', 'Participation in democratic life'],
              required: false
            },
            {
              id: 'address_priorities',
              text: 'Addressing priorities',
              fullQuestion: 'Please explain how your project will address the priorities you have selected.',
              type: 'textarea',
              required: true,
              charLimit: 3000
            },
            {
              id: 'topics',
              text: 'Topics addressed',
              fullQuestion: 'Please select the topics addressed by your project.',
              type: 'multiselect',
              options: ['Key Competences (incl. basic skills)', 'Digital skills', 'Green skills', 'Social inclusion', 'Creativity and culture', 'Active citizenship', 'Quality and innovation of education'],
              required: true
            }
          ]
        },
        {
          id: 'description',
          title: 'Project description',
          questions: [
            {
              id: 'motivation',
              text: 'Motivation',
              fullQuestion: 'Please describe the motivation for your project and explain why it should be funded at European level.',
              type: 'textarea',
              required: true,
              charLimit: 3000
            },
            {
              id: 'objectives_results',
              text: 'Objectives and results',
              fullQuestion: 'What are the objectives you would like to achieve and which concrete results do you expect the project to produce? Please explain how these objectives address the needs of the target groups.',
              type: 'textarea',
              required: true,
              charLimit: 3000
            },
            {
              id: 'innovation',
              text: 'Innovation',
              fullQuestion: 'What makes your proposal innovative compared to existing practices and available solutions? How does it go beyond the state of the art?',
              type: 'textarea',
              required: true,
              charLimit: 2000
            },
            {
              id: 'synergies',
              text: 'Synergies',
              fullQuestion: 'How is your proposal suitable for creating synergies between different fields of education, training and youth or for having a particularly strong impact on one or more of those fields?',
              type: 'textarea',
              required: true,
              charLimit: 3000
            },
            {
              id: 'eu_added_value',
              text: 'EU Added Value',
              fullQuestion: 'How does the proposal bring added value at European level through results that would not be attained by activities carried out in a single country?',
              type: 'textarea',
              required: true,
              charLimit: 2000
            },
            {
              id: 'follow_up_erasmus',
              text: 'Follow-up of Erasmus+',
              fullQuestion: 'Is this project a follow-up of a previous Erasmus+ funded project? If yes, please describe the link with the previous project(s) and how this project builds on the previous experience.',
              type: 'select',
              options: ['Yes', 'No'],
              required: true
            },
            {
              id: 'follow_up_other',
              text: 'Follow-up of other funding',
              fullQuestion: 'Is this project a follow-up of a project funded by other EU programmes? If yes, please describe the link.',
              type: 'select',
              options: ['Yes', 'No'],
              required: true
            },
            {
              id: 'synergy_other',
              text: 'Synergy with other initiatives',
              fullQuestion: 'Is this project in synergy with other EU initiatives or actions? If yes, please describe the link.',
              type: 'select',
              options: ['Yes', 'No'],
              required: true
            }
          ]
        },
        {
          id: 'needs_analysis',
          title: 'Needs analysis',
          questions: [
            {
              id: 'needs_address',
              text: 'Needs to address',
              fullQuestion: 'What needs do you want to address by implementing your project? How have these needs been identified?',
              type: 'textarea',
              required: true,
              charLimit: 3000
            },
            {
              id: 'target_groups',
              text: 'Target groups',
              fullQuestion: 'What are the target groups of your project? Who are the main direct and indirect beneficiaries? How will you ensure the participation of the target groups throughout the project lifecycle?',
              type: 'textarea',
              required: true,
              charLimit: 2000
            },
            {
              id: 'needs_id',
              text: 'Needs identification',
              fullQuestion: 'How did you identify the needs of your partnership and those of your target groups? What sources, data and methodologies did you use?',
              type: 'textarea',
              required: true,
              charLimit: 2000
            },
            {
              id: 'address_needs',
              text: 'Addressing needs',
              fullQuestion: 'How will your project address the identified needs of the target groups? Please explain the link between the needs and your proposed activities/results.',
              type: 'textarea',
              required: true,
              charLimit: 2000
            }
          ]
        }
      ]
    },
    // STEP 4: PARTNERSHIP
    {
      id: 4,
      title: 'Partnership and Cooperation Arrangements',
      sections: [
        {
          id: 'cooperation',
          title: 'Cooperation arrangements',
          questions: [
            {
              id: 'partnership_formation',
              text: 'Partnership formation',
              fullQuestion: 'How did you form your partnership? How does the mix of participating organisations complement each other and what is the added value of this cooperation?',
              type: 'textarea',
              required: true,
              charLimit: 3000
            },
            {
              id: 'task_allocation',
              text: 'Task allocation',
              fullQuestion: 'What is the task allocation and how does it reflect the commitment, capacity and expertise of each partner? How will you ensure that all partners are actively and appropriately involved in the project implementation?',
              type: 'textarea',
              required: true,
              charLimit: 3000
            },
            {
              id: 'coordination',
              text: 'Coordination',
              fullQuestion: 'Describe the mechanism for coordination and communication between the project partners, with stakeholders and with the National Agency if relevant.',
              type: 'textarea',
              required: true,
              charLimit: 3000
            }
          ]
        }
      ]
    },
    // STEP 5: IMPACT
    {
      id: 5,
      title: 'Impact and Dissemination',
      sections: [
        {
          id: 'impact_general',
          title: 'Impact and Dissemination',
          questions: [
            {
              id: 'assessment',
              text: 'Assessment',
              fullQuestion: 'How are you going to assess if the project objectives have been achieved? What indicators will you use to measure the quality and success of the project?',
              type: 'textarea',
              required: true,
              charLimit: 3000
            },
            {
              id: 'sustainability',
              text: 'Sustainability',
              fullQuestion: 'How will you ensure the sustainability of the project? What will happen with the results after the end of the EU funding? How will you ensure that the results remain available and continue to be used?',
              type: 'textarea',
              required: true,
              charLimit: 3000
            },
            {
              id: 'dissemination',
              text: 'Dissemination',
              fullQuestion: 'How do you plan to make the results of your project known within your partnership, in your local communities and in the wider public? Who are the main target groups of your dissemination activities?',
              type: 'textarea',
              required: true,
              charLimit: 3000
            },
            {
              id: 'impact_level',
              text: 'Impact level',
              fullQuestion: 'At which levels do you expect to have an impact? Please select all that apply.',
              type: 'multiselect',
              options: ['Local', 'Regional', 'National', 'European', 'International'],
              required: true
            },
            {
              id: 'impact_description',
              text: 'Impact description',
              fullQuestion: 'Please describe the expected impact of the project at each level you have selected.',
              type: 'textarea',
              required: true,
              charLimit: 3000
            }
          ]
        }
      ]
    },
    // STEP 6: WORK PACKAGES
    {
      id: 6,
      title: 'Project Design and Implementation',
      sections: wpSections
    },
    // STEP 7: PROJECT SUMMARY (LAST)
    {
      id: 7,
      title: 'Project Summary',
      sections: [
        {
          id: 'summary_content',
          title: 'Project Summary',
          description: 'Please provide a summary of your project. Be aware that this summary may be used for publicity purposes. Avoid including confidential information.',
          questions: [
            {
              id: 'objectives_summary',
              text: 'Objectives Summary',
              fullQuestion: 'Please provide a summary of your project objectives. This text will be made publicly available if the project is funded and must be written in English.',
              type: 'textarea',
              required: true,
              charLimit: 500
            },
            {
              id: 'implementation_summary',
              text: 'Activities Summary',
              fullQuestion: 'Please provide a summary of the main project activities. This text will be made publicly available if the project is funded and must be written in English.',
              type: 'textarea',
              required: true,
              charLimit: 500
            },
            {
              id: 'results_summary',
              text: 'Results Summary',
              fullQuestion: 'Please provide a summary of the expected project results. This text will be made publicly available if the project is funded and must be written in English.',
              type: 'textarea',
              required: true,
              charLimit: 500
            },
            {
              id: 'translation',
              text: 'Translation',
              fullQuestion: 'If the main language of your application is not English, please provide an English translation of the summary.',
              type: 'textarea',
              required: false,
              charLimit: 500
            }
          ]
        }
      ]
    },
    // STEP 8: FINAL EVALUATION (Quality Check)
    {
      id: 8,
      title: 'Final Evaluation',
      sections: [
        {
          id: 'final_evaluation',
          title: 'Consistency & Quality Check',
          description: 'Final review of the entire application for consistency, completeness, and quality.',
          questions: [
            {
              id: 'eval_consistency',
              text: 'Consistency Check',
              fullQuestion: 'Check for consistency across all sections: Are partner responsibilities aligned with WP assignments? Are KPIs measurable and realistic?',
              type: 'info'
            },
            {
              id: 'eval_completeness',
              text: 'Completeness Check',
              fullQuestion: 'Verify all required fields are filled and meet character limits.',
              type: 'info'
            },
            {
              id: 'eval_quality',
              text: 'Quality Assessment',
              fullQuestion: 'Assess the overall quality against Erasmus+ evaluation criteria.',
              type: 'info'
            }
          ]
        }
      ]
    }
  ];
};

// For backwards compatibility
export const OFFICIAL_PIPELINE_STRUCTURE = getOfficialPipelineStructure('KA220', 5);
