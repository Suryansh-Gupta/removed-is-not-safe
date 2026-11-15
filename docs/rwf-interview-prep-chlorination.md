# RWF Interview Prep — Chlorination

> **Outcome (added Nov 9):** the meeting happened. The plant gave no contact time or other numbers, its engineers declined follow-up interviews, and staff described antibiotics as a low-concern emerging contaminant. See `project-state.md`, Nov 9 entry. The fill-in numbers table at the end is still empty.

Oct 29, 2026 · @anonymous

Meeting with David Robertson (Supervising Environmental Services Specialist, ESD) today at 1:00 pm, 30 minutes. Question 10 matters most for the model; he offered written answers for anything you don't reach.

## Opening disclaimer (say this first, about 30 seconds)

"Thank you for making time for this. Before we start, a few quick things. I'm a high school student at Monta Vista doing an independent science fair project with my partner, Ritik Shenoy. I'm not working for any company or agency. When I first emailed, our project was about advanced oxidation, but we've since switched to chlorination, so my questions are a bit different from the list I sent. Everything you share will only be used for our science fair project. I'm not looking for anything confidential, and I understand your answers today are informal, not official City positions. If I'd like to quote you or use a number from the facility on our poster, I'll check it with you first. Is it okay if I record this so I can get the numbers right, or would you prefer I just take notes?"

Why each part is there:

- **The switch to chlorination.** He prepared for the old AOP list, so say this up front.
- **Informal, not official.** Staff often can't speak for the City; saying it first makes them more open.
- **Check before quoting.** Your research-experience form and poster may cite the facility, so this protects both of you.
- **Asking to record.** California requires everyone's consent to record a private conversation, so always ask. If he says no, just take notes.

If you're short on time, use this version: "I'm a high school student doing a science fair project on chlorination and antibiotics. This is only for the project, I'm not asking for anything confidential, and I'll check any quote with you before I use it. Is it okay if I record?"

## The 15 questions

Same list you sent, with three questions changed for chlorination (3, 10 and 11, marked ✎). Question 10 gets the plant numbers your model needs, so move it earlier if time looks short.

1. In the emerging contaminant study you shared, which antibiotics were hardest for the facility to remove?
2. Do any antibiotics get removed well by your current treatment process?
3. ✎ Which part of your treatment process removes the most antibiotics, and does chlorine disinfection change antibiotic levels much on its own?
4. How did San José's results in the BACWA pharmaceutical study compare to other Bay Area plants?
5. How does your team decide which emerging contaminants to monitor?
6. How often does the facility test for antibiotics, and has that changed over time?
7. Have antibiotic levels coming into the plant changed in recent years?
8. Where do most of the antibiotics in your wastewater come from?
9. Your facility sends water to the Silicon Valley Advanced Water Purification Center. How much antibiotic removal happens at your plant compared to the purification center?
10. ✎ My project now looks at chlorination instead of advanced oxidation. Does the facility disinfect with free chlorine or chloramine, and about how long is the contact time and how much bisulfite is added afterward?
11. ✎ If research showed that some chlorine doses or contact times left more antibiotic activity in the water than others, how hard would it be for a plant like yours to change those settings?
12. Does the facility work with any universities or research groups on emerging contaminants?
13. Do you think California's direct potable reuse rules will eventually require antibiotic monitoring?
14. To what extent are you concerned that low levels of antibiotics in treated wastewater could add to antibiotic resistance in the Bay?
15. What do you think is the biggest open question about antibiotics in wastewater right now?

If you run out of time: "Would it be okay if I sent the questions we didn't get to by email, like you offered?"

## Background you need

### The facility

- Treats about 110 million gallons a day on average (capacity 167) for about 1.5 million residents and 17,000+ businesses in eight cities, including Cupertino. Owned by San José and Santa Clara; run by San José's Environmental Services Department.
- Process order: screening and grit removal → primary settling → secondary biological nutrient removal (BNR) → secondary clarifiers → filtration → disinfection → dechlorination → Artesian Slough → South Bay.
- In 2011 it switched from chlorine gas and sulfur dioxide to **sodium hypochlorite** (liquid bleach) for disinfection and **sodium bisulfite** for dechlorination. It kept its existing chlorine contact basins.
- Permit (NPDES CA0037842, order R2-2025-0027): total residual chlorine ≤ 0.013 mg/L as a 1-hour average after dechlorination; ammonia ≤ 3.0 mg/L monthly average.
- In 2018 the State approved free-chlorine disinfection for its recycled water (modal contact time ≥ 4 min, free-chlorine CT ≥ 9 mg·min/L, residual ≥ 1.0 mg/L, ammonia monitored to prevent breakthrough). Contact time for the Bay discharge isn't published; your working estimate is 30–60 min.

### Chlorination chemistry

- Bleach in water makes **hypochlorous acid (HOCl)** and **hypochlorite (OCl⁻)**. Together they are "free chlorine." Their pKa is about 7.5, so at pH 7.5 it's half and half. HOCl is the stronger oxidant, so pH matters.
- If ammonia is present, free chlorine reacts with it to form **monochloramine (NH₂Cl)**, or dichloramine at higher chlorine-to-ammonia ratios. These are "combined chlorine." They're weaker and slower, but last longer.
- **Breakpoint chlorination**: add enough chlorine (about 7.6 mg Cl₂ per mg ammonia-N) to destroy the ammonia; after that point, extra chlorine stays free. Because BNR removes most ammonia, the RWF probably uses free chlorine. That's why question 1 matters: it decides which half of your experiment matches the plant.
- **CT** = chlorine concentration × contact time. It's how disinfection is measured. **Modal contact time** = the time when the most tracer comes out of a basin in a dye test.
- **Dechlorination**: bisulfite reduces chlorine (HSO₃⁻ + HOCl → SO₄²⁻ + Cl⁻ + 2H⁺). That's about 1.46 mg sodium bisulfite per mg Cl₂. Plants dechlorinate because chlorine is toxic to fish and invertebrates.

### Ciprofloxacin and chlorine (your project)

- Free chlorine attacks cipro's **piperazine ring** (the secondary amine) within seconds to minutes, forming N-chloro-cipro, which then breaks into smaller products (Dodd 2005).
- The **quinolone core** is the part that blocks bacterial DNA gyrase. Chlorine mostly leaves it alone, so products may still act on bacteria. Kennedy Neth 2019 and Jaén-Gil 2020 found antibacterial activity persisting after the parent drug was "removed."
- Chloramine reacts with cipro much more slowly than free chlorine.
- Your two gaps: (1) how much activity is left after chloramine; (2) whether bisulfite turns N-chloro-cipro back into cipro.
- Key point to make: routine monitoring measures the **original drug only**. A drop in cipro looks like "removal" even if the products still work against bacteria. That's your title: *Removed Is Not Safe*.

### The antibiotics in San José's study

| Antibiotic | Class | Why it matters for you |
| --- | --- | --- |
| Ofloxacin | Fluoroquinolone | Cipro's close relative. Its piperazine nitrogen carries a methyl group, so free chlorine reacts with it more slowly than with cipro. Good follow-up: did ofloxacin drop across disinfection? |
| Azithromycin, clarithromycin | Macrolides | Often poorly removed by biological treatment; results swing a lot between samples. |
| Sulfamethoxazole | Sulfonamide | Reacts with free chlorine; your original AOP target drug. |
| Lincomycin | Lincosamide | Less studied; ask whether it changed across treatment. |

### BACWA / SFEI pharmaceutical study (2018)

- Seven Bay Area plants (San José among them) sampled wastewater in 2016–2017 for 104 pharmaceuticals. Five used secondary treatment, two tertiary.
- It flagged 17 drugs that could exceed levels of concern for Bay wildlife, including six antibiotics: azithromycin, ciprofloxacin, clarithromycin, erythromycin, ofloxacin and sulfamethoxazole.
- Earlier SFEI work (2006 and 2008–2009) sampled two Lower South Bay plants. You can ask whether San José was one.

### Silicon Valley Advanced Water Purification Center

- Run by Valley Water across the street since 2014. Makes up to 8 million gallons a day using microfiltration → reverse osmosis → UV. It's blended with the RWF's recycled water for the purple-pipe system, not drunk yet.
- Descriptions say it takes the RWF's **secondary** effluent, which would be before the plant's own chlorination. Question 12 checks this.
- **Pure Water Silicon Valley**: direct potable reuse planned by Valley Water, San José and Santa Clara. On June 9, 2026 Valley Water picked a designer for a demonstration facility (200 gallons/minute pilot, up to $100 million). Full scale could reach 24,000 acre-feet a year.

### Regulations

- **Direct potable reuse (DPR)** rules were adopted by the State Water Board on December 19, 2023. They add stronger source control, including a monitoring program for constituents of emerging concern (CECs).
- The **Recycled Water Policy** (amended 2018) requires CEC monitoring for groundwater recharge and reservoir augmentation, including bioassays for estrogen-like and dioxin-like activity. There's no antibacterial-activity test in that list, which connects directly to your question 14.
- As far as we know there's no discharge limit for antibiotics in the permit (worth confirming). The suggested resistance limit for cipro is 0.064 µg/L (Bengtsson-Palme & Larsson 2016).

### Words he might use

| Term | Meaning |
| --- | --- |
| BNR | Biological nutrient removal: bacteria remove ammonia (nitrification) and nitrate (denitrification) |
| Tertiary | Extra treatment after secondary, here filtration |
| TRC | Total residual chlorine (free + combined) |
| ADWF | Average dry-weather flow |
| Effluent / influent | Water leaving / entering the plant |
| NPDES | Federal discharge permit system |
| Title 22 | California's recycled water standards |
| RO concentrate | The salty reject stream from reverse osmosis, often sent back to the Bay outfall |
| CEC | Constituent of emerging concern |
| LC-MS/MS | The instrument labs use to measure drugs at ng/L levels |

## Follow-ups: if he says this, ask that

| Q | If he says… | Follow up with… |
| --- | --- | --- |
| 1 | Names a drug | "Was it measured after chlorination? Did ofloxacin, cipro's relative, go down across disinfection?" |
| 3 | "Biological treatment" | "Is that breakdown or sticking to the sludge?" (Cipro sticks to solids strongly.) |
| 3 | "We haven't checked chlorine alone" | "Would before-and-after samples around disinfection be possible?" |
| 9 | "Secondary effluent" | "So the purification center gets water before your chlorination. Does it add its own chlorine or chloramine before RO?" |
| 10 | "Free chlorine" | "Is there ever enough ammonia to form chloramine, like during wet weather or a nitrification upset?" |
| 10 | "Chloramine" / "combined" | "Is ammonia added on purpose, or is it what's left after treatment? About what chlorine-to-ammonia ratio?" (Then your chloramine experiment is the plant-matching one.) |
| 10 | A contact time | "Is that the modal time from a tracer test, or tank volume divided by flow? How short does it get at peak wet-weather flow?" |
| 10 | A bisulfite dose | "Is it set from a chlorine analyzer or a fixed ratio? How much extra bisulfite is left over?" (Extra bisulfite is what could turn N-chloro-cipro back into cipro.) Also: "What pH and temperature is the water at that point?" |
| 11 | "Not much room" | "What sets the limit: the coliform target, the residual limit, chemical cost, or byproducts?" |
| 13 | "Maybe bioassays" | "Would an antibacterial-activity test ever be added to the bioassay list, like the estrogen ones?" |

**When you don't know enough to follow up**, use one of these:

- Repeat his key word as a question: "Breakpoint?" "Upset events?"
- "How do you know that? Is it measured or estimated?"
- "Is that written down anywhere I could cite?"
- "What's still unknown about that?"
- "Could you give me a rough number or range?"

**Don't** argue with his numbers, guess at the facility's performance, or say the plant is doing anything wrong. Your project is a lab model, not an evaluation of the RWF.

## Numbers to leave with

Fill the last column during the call. Each one replaces an estimate in your model, reactor plan or research plan.

| Item | Current estimate | Plant's answer |
| --- | --- | --- |
| Chlorine form (free or chloramine) | Probably free (BNR removes ammonia) |  |
| Contact time at average flow | 30–60 min |  |
| Chlorine dose / residual at end of basins | 1–10 mg/L tested; residual unknown |  |
| Ammonia in filtered effluent | ≤ 3.0 mg/L (permit limit) |  |
| pH / temperature into disinfection | pH 7.5, 22 °C (lab defaults) |  |
| Bisulfite dose or ratio | Slight excess over residual (1.46 mg/mg Cl₂) |  |
| Time from dechlorination to discharge | Unknown (you hold samples 5 min) |  |
| Effluent sample possible? Contact? | Unknown |  |

## Sources

- [City of San José: Regional Wastewater Facility](https://www.sanjoseca.gov/your-government/departments-offices/environmental-services/water-utilities/regional-wastewater-facility)
- [2011 Annual Self-Monitoring Report (switch to sodium hypochlorite)](https://sanjoseca.gov/home/showpublisheddocument/946/636613776119270000)
- [SCU senior thesis, 2016 (hypochlorite/bisulfite conversion)](https://scholarcommons.scu.edu/ceng_senior/46)
- [SFEI: Screening of Pharmaceuticals in SF Bay Wastewater (BACWA report)](https://www.sfei.org/sites/default/files/biblio_files/BACWA%20Pharmaceutical%20Report_103018.pdf) and [summary](https://www.sfei.org/node/7142)
- [Valley Water: Pure Water Silicon Valley next step (June 2026)](https://www.valleywater.org/news-events/news-releases/PureWaterSiliconValleytakesnextsteptowardamoreresilientwaterfuture)
- [Black & Veatch: SVAWPC](https://www.bv.com/projects/increasing-the-water-supply-throughout-californias-silicon-valley)
- [WateReuse: summary of California DPR regulations](https://watereuse.org/wp-content/uploads/2024/01/DPR-Major-Provisions-1-26.pdf)
- [State Water Board: Recycled Water Policy amendment, 2018](https://www.waterboards.ca.gov/board_decisions/adopted_orders/resolutions/2018/121118_7_final_amd.pdf)
- Permit limits, 2018 recycled-water approval and chemistry papers (Dodd 2005, Kennedy Neth 2019, Jaén-Gil 2020, Bengtsson-Palme & Larsson 2016): from the project's status doc and research plan.
