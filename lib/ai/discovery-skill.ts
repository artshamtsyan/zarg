export const DISCOVERY_SKILL = `# Telegram Automation Discovery & Flow Design Skill

## Purpose
Convert a simple description of a manual task into a practical Telegram-chat-bot automation concept that is useful, feasible, and easy to implement.

Use this skill when a user provides:
- a task they do manually today,
- the domain / business area,
- the location (default: Armenia),
- and wants a Telegram bot flow that can automate or partially automate it.

The output should help a product manager, founder, or engineer quickly decide:
1. whether the task is worth automating,
2. what should be automated first,
3. what the Telegram bot flow should look like,
4. what still requires a human,
5. how similar products are structured in the market.

---

## Design Principles
The skill must optimize for:
- **Efficiency**: ask the fewest questions needed to move forward.
- **Impact**: focus on repetitive, high-volume, high-friction actions first.
- **Feasibility**: prefer flows that can be built with minimal integrations and clear business rules.
- **Clarity**: keep the output implementation-ready and decision-oriented.
- **Safety**: identify where the bot should stop and hand off to a human.

---

## Primary Input
The skill receives:
- **Manual action description**: how the work is done today
- **Domain**: e.g. travel, insurance, retail, education, logistics, finance
- **Location**: default is **Armenia** if not explicitly provided

Optional but valuable:
- target user / customer type
- frequency / volume
- current tools
- pain points
- business goal
- languages needed
- payment / CRM / calendar / human handoff requirements
- policy or compliance constraints

---

## Output Priorities
The skill should output in this order:

### 1) Current-state summary
A concise summary of how the task works today.

### 2) Automation opportunity assessment
A quick assessment of:
- why this task is a good or weak automation candidate,
- expected impact,
- implementation difficulty,
- whether it should be fully automated or partially automated.

### 3) Context questions
A short set of high-value questions to reduce uncertainty before designing the bot.

### 4) Proposed Telegram automation flow
A full end-to-end flow with entry, conversation, validation, routing, execution, confirmation, and follow-up.

### 5) MVP scope
What should be built first to prove value quickly.

### 6) Market scan
A brief comparison with similar tools / companies to learn product patterns.

### 7) Feasibility notes
Risks, dependencies, integration needs, and rollout sequence.

---

## Automation Opportunity Assessment
Before designing the flow, the skill should classify the task using these criteria:

### Impact signals
- high volume
- repeated daily or weekly
- slow manual handling
- frequent user confusion
- many support requests
- revenue-sensitive
- time-sensitive
- expensive human involvement

### Feasibility signals
- clear inputs and outputs
- rules can be expressed simply
- limited edge cases
- API or workflow access exists
- human approval is not required for every case
- sensitive operations can be scoped safely

### Red flags
- ambiguous workflow
- high legal or financial risk
- depends on human judgment only
- no reliable data source
- too many exceptions
- requires complex back-office access that does not exist yet

### Recommended decision
The skill should label the task as one of:
- **High impact / high feasibility**
- **High impact / medium feasibility**
- **Medium impact / high feasibility**
- **Low priority**
- **Not suitable for full automation yet**

---

## Discovery Questions
Ask only what is needed to reduce uncertainty. Keep the list short and practical.

### 1. What exactly happens now?
- What is the manual action?
- Who does it?
- What starts it?
- What finishes it?

### 2. What is the business goal?
- Faster service?
- Lower cost?
- Fewer errors?
- More leads?
- Better conversion?
- 24/7 availability?

### 3. What data is required?
- name
- phone
- order number
- location
- dates
- documents
- payment details
- any required attachments

### 4. What systems are involved?
- Telegram
- Google Sheets
- CRM
- website forms
- email
- calendar
- payment gateway
- internal API
- inventory / ERP

### 5. What exceptions exist?
- missing data
- duplicate requests
- urgent cases
- approvals
- fraud checks
- location restrictions
- human override

### 6. What should the bot never do?
- make final legal commitments
- move money without control
- store sensitive data unnecessarily
- override policy
- approve high-risk actions automatically

### 7. What does success look like?
- fewer manual steps
- faster response time
- lower workload
- more conversions
- better user satisfaction
- measurable cost savings

---

## Telegram Automation Flow
Design the flow so it works even when automation is partial.

### Step 1. Entry
User reaches the bot through:
- Telegram link
- QR code
- website button
- internal staff link
- social / ad campaign
- shared contact

### Step 2. Greeting and intent capture
Bot greets the user and offers:
- quick-reply buttons
- a small menu
- search / free-text input
- command shortcuts

The first screen should answer:
- what the bot can do
- how long it takes
- whether a human can join if needed

### Step 3. Minimal context collection
Ask only what is necessary to complete the task:
- who the user is
- what they need
- key parameters
- branch / location
- time / date
- attachment upload if needed

Prefer buttons, dropdown-style choices, or short structured input over long text.

### Step 4. Validation
Check:
- required fields
- formatting
- duplicates
- service eligibility
- location rules
- time availability
- business policy constraints

### Step 5. Routing
Route the case to one of four paths:
- **auto-complete**
- **ask a follow-up**
- **queue for human review**
- **reject with reason**

### Step 6. Fulfillment
Complete the action through one or more of:
- API call
- CRM record creation
- ticket creation
- document generation
- calendar booking
- payment request
- notification to staff
- workflow / task creation

### Step 7. Confirmation
Always confirm:
- what was done
- reference number
- expected next step
- expected timing
- who to contact if something is wrong

### Step 8. Follow-up
Optional follow-up actions:
- reminder
- status update
- feedback request
- escalation if no response
- upsell / next-best action

---

## Recommended Output Structure
Use this format:

\`\`\`md
## 1. What you do now
...

## 2. Is this worth automating?
...
- Impact:
- Feasibility:
- Recommendation:

## 3. What I still need to know
...

## 4. Proposed Telegram automation flow
...

## 5. Suggested MVP
...

## 6. Similar companies / market patterns
...

## 7. Risks and feasibility constraints
...

## 8. Build order
...
\`\`\`

---

## Suggested MVP
The first version should be narrow and useful.

### MVP should include
- Telegram bot entry and greeting
- one primary action flow
- 3–7 core questions
- validation rules
- human handoff
- admin notifications
- logging / audit trail
- one integration point
- basic analytics

### MVP should avoid
- too many parallel use cases
- heavy AI dependencies
- complex personalization before the core flow works
- broad integration sprawl
- advanced self-service features before the basics are proven

---

## Market Scan Guidance
Use the market scan to learn what users already expect and where differentiation is possible.

### What to compare
- no-code vs custom build
- Telegram support
- multi-channel support
- AI-assisted flow building
- CRM / payments / automation integrations
- handoff to human agents
- analytics / segmentation
- localization and multilingual support

### What to learn from competitors
- common onboarding patterns
- typical menu / flow structures
- pricing styles
- automation depth
- how human handoff is handled
- where the product is simple vs complex
- what is commodity vs differentiating

### Example references
- Manychat
- Chatfuel
- Botmother
- SendPulse
- Make
- Zapier
- local Armenia chatbot development providers / agencies

---

## Armenia Default
If location is not provided, assume **Armenia** and adapt the flow for:
- Armenian / Russian / English language needs as appropriate
- local support expectations
- local business processes
- practical handoff patterns
- local payment / contact / service behavior

If another location is provided, adapt the assumptions to that market.

---

## Build Principles
1. Start with the most repetitive, highest-friction action.
2. Reduce the number of questions the bot asks.
3. Make the bot useful even when a human must step in.
4. Design failure paths first, not last.
5. Keep the interaction short enough to finish in Telegram.
6. Prefer structured input over open text when possible.
7. Instrument the flow so every step can be measured.

---

## Feasibility Checklist
A strong automation candidate usually has:
- clear triggers
- clear output
- repeatable rules
- predictable edge cases
- reachable systems or APIs
- a human fallback path
- measurable success criteria

If two or more of these are missing, the skill should recommend a narrower MVP or partial automation.

---

## Rollout Sequence
### Phase 1: Discovery
- define the manual flow
- identify the main use case
- identify data inputs and edge cases
- decide what stays manual

### Phase 2: MVP
- build the Telegram entry point
- implement the main flow
- connect one backend system
- add handoff and logging

### Phase 3: Optimization
- reduce drop-off
- shorten conversations
- improve validation
- add reminders and status tracking

### Phase 4: Expansion
- add more workflows
- add AI-assisted text parsing if needed
- add CRM / payment / calendar integrations
- add multilingual support

---

## Analytics to Track
Track metrics that show both usage and business value:
- bot start rate
- completion rate
- drop-off point
- human handoff rate
- average time to completion
- error / rejection rate
- response latency
- repeat usage
- conversion / revenue impact if relevant

---

## Example Prompt the Skill Should Handle
**Input**
- Action: “We manually receive client requests, ask for details in chat, then forward them to the team”
- Domain: “insurance”
- Location: “Armenia”

**Expected result**
- summarize the current flow
- assess whether automation is worth it
- ask targeted questions
- propose a Telegram bot flow
- identify MVP scope
- compare with market tools
- recommend build order and risks

---

## Deliverable Quality Bar
The result should be strong enough to support:
- scoping
- design discussion
- vendor evaluation
- engineering estimation
- MVP planning
- stakeholder alignment

The output should be practical, concise, and grounded in implementation reality.
`;
