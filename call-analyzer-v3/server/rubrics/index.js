/**
 * TSC Call Audit — Scoring Rubrics by Lead Source
 *
 * Each rubric defines:
 *   - context: what the agent should know about this lead type
 *   - goal: the primary outcome expected from this call
 *   - parameters: scored dimensions with weight, description, and scoring guide
 *   - red_flags: behaviors that trigger penalty deductions
 *   - ideal_call: what a perfect call looks like (used as reference in Claude prompt)
 */

const RUBRICS = {
  "Find Store - Store Found": {
    context:
      "The customer found a Sleep Company store via the website/WhatsApp bot by entering their pincode. They already have intent to visit. The agent's job is NOT to sell on the phone — it is to confirm the visit, share store details, and create urgency to visit soon.",
    goal: "Get the customer to commit to a store visit date/time. Minimize phone selling.",
    parameters: [
      {
        name: "Greeting & Introduction",
        weight: 5,
        description: "Professional greeting with agent name and company name.",
        scoring: "5 = Clear greeting with name + company. 3 = Partial (missing name or company). 1 = No proper greeting. 0 = Rude/abrupt start.",
      },
      {
        name: "Store Visit Confirmation",
        weight: 25,
        description:
          "PRIMARY METRIC. Did the agent push for a store visit? Did they confirm store location, share address/Google Maps link, and store timings?",
        scoring:
          "25 = Confirmed store, shared location + timings, asked when customer will visit. 18 = Mentioned store but didn't share details. 10 = Briefly mentioned store. 0 = Never pushed for store visit or pushed online purchase instead.",
      },
      {
        name: "Visit Date Locking",
        weight: 20,
        description:
          "Did the agent get a committed date or timeframe for the store visit?",
        scoring:
          "20 = Customer committed to specific date/day. 15 = Customer gave vague timeline ('this week', 'soon'). 8 = Agent asked but customer didn't commit. 0 = Agent never asked when customer will visit.",
      },
      {
        name: "Urgency Creation",
        weight: 15,
        description:
          "Did the agent create a reason for the customer to visit sooner? (ongoing sale, limited period offers, stock availability, weekend discounts)",
        scoring:
          "15 = Strong urgency with specific offer/deadline. 10 = Mentioned offers but no deadline. 5 = Vague urgency. 0 = No urgency created.",
      },
      {
        name: "Brief Product Overview",
        weight: 10,
        description:
          "A SHORT overview of what the store offers — SmartGrid tech, range options. Should be 2-3 sentences max, not a full sales pitch.",
        scoring:
          "10 = Concise 2-3 line overview. 7 = Slightly longer but still relevant. 3 = Excessive product pitch (penalty territory). 0 = No product mention at all OR spent majority of call on product details.",
      },
      {
        name: "Offer Communication",
        weight: 10,
        description:
          "Mentioned ongoing discounts, bank offers, or promotions available at the store to incentivize the visit.",
        scoring:
          "10 = Clear mention of current offers with specifics. 6 = Vague offer mention. 0 = No offers mentioned.",
      },
      {
        name: "Call Control & Professionalism",
        weight: 10,
        description:
          "Agent maintained control of the conversation, was polite, didn't ramble, handled objections well.",
        scoring:
          "10 = Confident, polite, controlled the flow. 6 = Mostly professional with minor issues. 3 = Lost control or was pushy. 0 = Rude or completely disorganized.",
      },
      {
        name: "Closing",
        weight: 5,
        description:
          "Proper sign-off with next steps confirmed — confirmed visit plan, offered to send location on WhatsApp, thanked the customer.",
        scoring:
          "5 = Clean close with next steps. 3 = Basic thank you, no next steps. 0 = Abrupt end.",
      },
    ],
    red_flags: [
      {
        flag: "Pushed online purchase instead of store visit",
        penalty: -15,
        description:
          "For a 'Find Store' lead, pushing online purchase is a critical deviation from the spiel. The customer already wants to visit.",
      },
      {
        flag: "Never mentioned store location or timings",
        penalty: -10,
        description:
          "The entire purpose of this call is to facilitate a store visit. Not sharing basic store info is a failure.",
      },
      {
        flag: "Excessive product pitching (>50% of call)",
        penalty: -5,
        description:
          "Spending more than half the call on detailed product education when the customer just needs to come to the store.",
      },
      {
        flag: "Shared incorrect information",
        penalty: -10,
        description:
          "Wrong pricing, wrong store timings, wrong product specs. Damages credibility.",
      },
      {
        flag: "Rude or unprofessional behavior",
        penalty: -10,
        description: "Interrupting, dismissive tone, impatient responses.",
      },
      {
        flag: "Did not identify themselves or the company",
        penalty: -5,
        description: "Customer should know who is calling and from where.",
      },
    ],
    ideal_call:
      "Agent greets professionally, quickly confirms the customer's interest in visiting, shares the nearest store address and timings, mentions the ongoing sale/offer to create urgency, locks a visit date, and closes with a WhatsApp message containing the store location. Total call duration: 2-4 minutes. Minimal product pitching.",
  },

  "Arrange Call Back": {
    context:
      "The customer requested a callback from the Sleep Company website. Their intent is exploratory — they want information before deciding. The agent needs to understand the customer's needs, educate them on the right product, and then push for a store visit or online purchase.",
    goal: "Understand requirement, recommend the right product, and convert to store visit or purchase.",
    parameters: [
      {
        name: "Greeting & Introduction",
        weight: 5,
        description: "Professional greeting with agent name and company name. Acknowledge the callback request.",
        scoring: "5 = Clear greeting + acknowledged callback. 3 = Greeting but no callback mention. 0 = No proper greeting.",
      },
      {
        name: "Need Identification",
        weight: 20,
        description:
          "Did the agent ask what the customer is looking for? Size, firmness preference, budget, who will use it, any specific issues (back pain, heat, etc.)?",
        scoring:
          "20 = Asked 3+ qualifying questions. 14 = Asked 1-2 questions. 7 = Assumed without asking. 0 = Jumped straight to pitching.",
      },
      {
        name: "Product Recommendation",
        weight: 20,
        description:
          "Did the agent recommend a specific product based on the customer's stated needs? Was the recommendation relevant?",
        scoring:
          "20 = Tailored recommendation matching stated needs. 14 = Generic recommendation. 7 = Mismatched recommendation. 0 = No recommendation given.",
      },
      {
        name: "Product Education",
        weight: 15,
        description:
          "Explained SmartGrid technology, differentiated from memory foam/coir, shared relevant product features. Should be conversational, not scripted.",
        scoring:
          "15 = Clear, relevant explanation. 10 = Adequate but scripted. 5 = Too brief or too long-winded. 0 = No product education.",
      },
      {
        name: "Pricing & Offers",
        weight: 10,
        description: "Shared pricing, current discounts, bank offers, EMI options.",
        scoring:
          "10 = Complete pricing + offers shared. 6 = Partial info. 0 = No pricing discussed.",
      },
      {
        name: "Store Visit / Purchase Push",
        weight: 15,
        description:
          "After educating, did the agent push the customer toward a next step — either store visit to try the mattress or an online purchase?",
        scoring:
          "15 = Clear CTA with urgency. 10 = Mentioned visit/purchase but no push. 5 = Weak suggestion. 0 = No next step discussed.",
      },
      {
        name: "Objection Handling",
        weight: 5,
        description:
          "If the customer raised concerns (price, competition, timing), did the agent handle them well?",
        scoring:
          "5 = Handled confidently with relevant counters. 3 = Partial handling. 0 = Ignored or fumbled.",
      },
      {
        name: "Call Control & Professionalism",
        weight: 5,
        description: "Agent maintained control, polite, clear communication.",
        scoring: "5 = Excellent. 3 = Adequate. 0 = Poor.",
      },
      {
        name: "Closing",
        weight: 5,
        description: "Proper close with confirmed next steps.",
        scoring: "5 = Clean close + next steps. 3 = Basic close. 0 = Abrupt.",
      },
    ],
    red_flags: [
      { flag: "No need identification — jumped to pitching", penalty: -10 },
      { flag: "Recommended wrong product for stated needs", penalty: -10 },
      { flag: "Shared incorrect pricing or offer details", penalty: -10 },
      { flag: "Rude or unprofessional behavior", penalty: -10 },
      { flag: "No next step or CTA discussed", penalty: -5 },
    ],
    ideal_call:
      "Agent greets, acknowledges the callback, asks 3-4 qualifying questions (size, firmness, budget, use case), recommends 1-2 specific products with brief SmartGrid explanation, shares pricing + current offer, creates urgency, and pushes for store visit or online purchase with a specific timeline. Duration: 4-7 minutes.",
  },

  "Website Enquiry": {
    context:
      "Customer browsed the website and submitted an enquiry form. Intent level is moderate — they are researching. Agent needs to qualify and convert.",
    goal: "Qualify the lead, educate on product, and push toward store visit or purchase.",
    parameters: [
      { name: "Greeting & Introduction", weight: 5, scoring: "5/3/0 scale." },
      { name: "Need Identification", weight: 20, scoring: "Asked qualifying questions about requirement." },
      { name: "Product Recommendation", weight: 15, scoring: "Relevant recommendation based on needs." },
      { name: "Product Education", weight: 15, scoring: "SmartGrid tech explanation, differentiation." },
      { name: "Pricing & Offers", weight: 10, scoring: "Shared pricing and current offers." },
      { name: "Store Visit / Purchase Push", weight: 15, scoring: "Clear CTA with next step." },
      { name: "Objection Handling", weight: 10, scoring: "Handled price/competition concerns." },
      { name: "Call Control & Closing", weight: 10, scoring: "Professional flow and clean close." },
    ],
    red_flags: [
      { flag: "No qualifying questions asked", penalty: -10 },
      { flag: "Shared incorrect information", penalty: -10 },
      { flag: "Rude or dismissive", penalty: -10 },
    ],
    ideal_call:
      "Qualification-heavy call. Agent qualifies, recommends, educates briefly, shares offer, and gets a commitment.",
  },

  "BNPL Lead": {
    context:
      "Customer showed interest in Buy Now Pay Later options. They are price-sensitive and EMI/financing is the key lever.",
    goal: "Explain BNPL options clearly, remove payment friction, and convert to purchase or store visit.",
    parameters: [
      { name: "Greeting & Introduction", weight: 5, scoring: "5/3/0 scale." },
      { name: "BNPL Explanation", weight: 25, scoring: "Clear explanation of BNPL process, eligibility, tenure, interest." },
      { name: "Need Identification", weight: 10, scoring: "What product, what size, what budget." },
      { name: "Product + Pricing", weight: 15, scoring: "Shared relevant product with EMI breakdown." },
      { name: "Payment Friction Removal", weight: 20, scoring: "Addressed concerns about credit check, documentation, process." },
      { name: "Store Visit / Purchase Push", weight: 15, scoring: "Clear CTA." },
      { name: "Call Control & Closing", weight: 10, scoring: "Professional, clean close with next steps." },
    ],
    red_flags: [
      { flag: "Could not explain BNPL process", penalty: -15 },
      { flag: "Shared wrong EMI/tenure details", penalty: -10 },
      { flag: "Dismissed customer's budget concerns", penalty: -10 },
    ],
    ideal_call:
      "Agent qualifies quickly, explains BNPL clearly with monthly EMI amount, removes doubt about the process, and pushes for purchase with specific offer deadline.",
  },

  "WhatsApp Lead": {
    context:
      "Lead generated via WhatsApp interaction. Customer may have engaged with the bot and needs human follow-up.",
    goal: "Pick up from where the bot left off, qualify, and convert to store visit or purchase.",
    parameters: [
      { name: "Greeting & Context Setting", weight: 10, scoring: "Referenced the WhatsApp interaction." },
      { name: "Need Identification", weight: 15, scoring: "Qualified the customer's requirement." },
      { name: "Product Recommendation", weight: 15, scoring: "Relevant product suggestion." },
      { name: "Pricing & Offers", weight: 15, scoring: "Clear pricing with current offers." },
      { name: "Store Visit / Purchase Push", weight: 20, scoring: "Strong CTA with urgency." },
      { name: "Objection Handling", weight: 10, scoring: "Handled concerns effectively." },
      { name: "Call Control & Closing", weight: 15, scoring: "Professional close with next steps." },
    ],
    red_flags: [
      { flag: "Did not reference WhatsApp conversation", penalty: -5 },
      { flag: "Repeated questions the bot already asked", penalty: -5 },
      { flag: "Shared incorrect information", penalty: -10 },
    ],
    ideal_call:
      "Agent references the WhatsApp interaction, picks up context, qualifies briefly, and efficiently moves to conversion.",
  },

  "Walk-in Follow Up": {
    context:
      "Customer visited the store but did not purchase. This is a warm follow-up call to close the sale.",
    goal: "Understand why they didn't buy, address objections, and close the sale (online or return visit).",
    parameters: [
      { name: "Greeting & Visit Reference", weight: 10, scoring: "Referenced the store visit specifically." },
      { name: "Feedback Collection", weight: 15, scoring: "Asked why they didn't purchase, what they liked/didn't." },
      { name: "Objection Handling", weight: 25, scoring: "Addressed the specific reason for non-purchase (price, need to compare, partner decision, etc.)." },
      { name: "Offer Sweetener", weight: 15, scoring: "Shared any additional offer or incentive to close now." },
      { name: "Purchase / Return Visit Push", weight: 20, scoring: "Clear push to buy online or come back." },
      { name: "Call Control & Closing", weight: 15, scoring: "Professional, not pushy, clean close." },
    ],
    red_flags: [
      { flag: "Did not ask why customer didn't purchase", penalty: -10 },
      { flag: "Was overly pushy or aggressive", penalty: -10 },
      { flag: "Could not address the objection", penalty: -5 },
    ],
    ideal_call:
      "Agent references the visit, asks what happened, listens to the objection, addresses it with a relevant counter-offer, and gets a commitment to buy or return.",
  },

  "Exchange Program": {
    context:
      "Customer is interested in the mattress exchange program. They want to trade in an old mattress for a discount on a new Sleep Company mattress.",
    goal: "Explain the exchange process clearly and convert to store visit or online purchase with exchange.",
    parameters: [
      { name: "Greeting & Introduction", weight: 5, scoring: "5/3/0 scale." },
      { name: "Exchange Process Explanation", weight: 25, scoring: "Clear explanation of how exchange works — pickup, valuation, discount application." },
      { name: "Need Identification", weight: 10, scoring: "What mattress they want, size, current mattress details." },
      { name: "Pricing with Exchange Benefit", weight: 20, scoring: "Showed the net price after exchange discount." },
      { name: "Store Visit / Purchase Push", weight: 20, scoring: "Clear CTA to proceed." },
      { name: "Objection Handling", weight: 10, scoring: "Addressed concerns about the exchange process." },
      { name: "Call Control & Closing", weight: 10, scoring: "Professional close." },
    ],
    red_flags: [
      { flag: "Could not explain the exchange process", penalty: -15 },
      { flag: "Shared wrong exchange valuation", penalty: -10 },
    ],
    ideal_call:
      "Agent explains exchange process end-to-end, qualifies the old mattress, shows net pricing, and pushes for a decision.",
  },

  "Campaign Lead": {
    context:
      "Lead generated from a marketing campaign (ads, social media, email). Intent level varies. Agent needs to qualify quickly.",
    goal: "Qualify the lead, educate if interested, and convert to store visit or purchase.",
    parameters: [
      { name: "Greeting & Introduction", weight: 5, scoring: "5/3/0 scale." },
      { name: "Need Identification", weight: 20, scoring: "Quick qualification of intent and requirement." },
      { name: "Product Recommendation", weight: 15, scoring: "Matched product to need." },
      { name: "Product Education", weight: 15, scoring: "Brief, relevant explanation." },
      { name: "Pricing & Offers", weight: 15, scoring: "Campaign-specific offer highlighted." },
      { name: "Store Visit / Purchase Push", weight: 15, scoring: "Clear CTA." },
      { name: "Call Control & Closing", weight: 15, scoring: "Professional flow." },
    ],
    red_flags: [
      { flag: "Did not mention the campaign offer", penalty: -5 },
      { flag: "Shared incorrect information", penalty: -10 },
    ],
    ideal_call:
      "Fast qualification, relevant product pitch tied to the campaign offer, strong CTA.",
  },

  Referral: {
    context:
      "Customer was referred by an existing Sleep Company customer. Higher trust baseline. Agent should acknowledge the referral.",
    goal: "Leverage the referral trust, qualify, and convert quickly.",
    parameters: [
      { name: "Greeting & Referral Acknowledgment", weight: 10, scoring: "Acknowledged the referral, asked who referred." },
      { name: "Need Identification", weight: 15, scoring: "Qualified requirement." },
      { name: "Product Recommendation", weight: 15, scoring: "Relevant product suggestion." },
      { name: "Pricing & Offers", weight: 15, scoring: "Pricing + any referral-specific benefit." },
      { name: "Store Visit / Purchase Push", weight: 20, scoring: "Strong CTA leveraging referral trust." },
      { name: "Objection Handling", weight: 10, scoring: "Handled concerns." },
      { name: "Call Control & Closing", weight: 15, scoring: "Professional close." },
    ],
    red_flags: [
      { flag: "Did not acknowledge the referral", penalty: -10 },
      { flag: "Shared incorrect information", penalty: -10 },
    ],
    ideal_call:
      "Agent acknowledges the referral warmly, leverages the trust to fast-track the conversation, qualifies, and converts with minimal friction.",
  },

  Other: {
    context: "General lead with unspecified source. Agent should qualify from scratch.",
    goal: "Understand the customer's needs, educate, and push for next step.",
    parameters: [
      { name: "Greeting & Introduction", weight: 5, scoring: "5/3/0 scale." },
      { name: "Need Identification", weight: 20, scoring: "Thorough qualification." },
      { name: "Product Recommendation", weight: 15, scoring: "Relevant suggestion." },
      { name: "Product Education", weight: 15, scoring: "Clear explanation." },
      { name: "Pricing & Offers", weight: 15, scoring: "Complete pricing info." },
      { name: "Store Visit / Purchase Push", weight: 15, scoring: "Clear CTA." },
      { name: "Call Control & Closing", weight: 15, scoring: "Professional throughout." },
    ],
    red_flags: [
      { flag: "No qualification attempted", penalty: -10 },
      { flag: "Shared incorrect information", penalty: -10 },
    ],
    ideal_call: "Standard sales call with proper qualification, education, and conversion push.",
  },
};

module.exports = RUBRICS;
