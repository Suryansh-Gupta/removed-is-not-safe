# Partner handoff — your five deliverables

**Written:** 2026-10-17. **Status: CURRENT.** Addressed to the partner joining the project. For live status read `project-state.md`; for the project explained from scratch read `project-overview.md`.

---

## Read this first

Welcome. Here is the short version of where you're joining.

The project asks whether water that has been chlorinated still stops bacteria, even after the antibiotic in it has been destroyed. The chemistry half is built and validated — a model that predicts what chlorine does to ciprofloxacin over time. The reactor that will test it is being built right now and should be running by **15 November**.

**Everything below is deliberately chosen so you are not waiting on that reactor.** All five are laptop work or paperwork. None of them need lab access, bench time, or anything to be ordered and delivered first. Two of them are already past their original date, which is why they're first.

One thing you will need from the other partner before you can finish items 3, 4 and 5: **write access to the GitHub repository.** Ask for it on day one.

---

## 1. Get the safety paperwork to signature-ready

**Target: this week.** It was due 16 October, so it's the one genuinely holding things up.

Nothing in this project involving bacteria can start until the fair's Scientific Review Committee — the safety panel that reviews projects before work begins — approves it. Approval takes weeks, so every day this sits costs a day at the far end.

What you do:

- Complete every form in the packet, including the one specific to growing bacteria. The organism is a harmless laboratory strain of *E. coli*, rated biosafety level 1, and the rules require it to be grown in a properly rated lab — never at home.
- Write the research plan attachment that goes with the forms.
- Download the safety data sheet for the ciprofloxacin we intend to buy (Sigma-Aldrich part 17850) and write the hazard section from it. **Read it closely for any reproductive-toxicity listing.** Under the 2026–27 rules that would force the work into a research institution or a restricted fume hood, which would rule out the community lab we were planning to use. If you find that, say so immediately — it changes where the whole project can happen.
- Fill in the additional form for working at an outside site, since some of the measurement work happens at BioCurious, a community biology lab.

You don't have to talk to anyone or chase anybody. Get the packet to the state where the only blank spaces left are signature lines; the other partner handles the signatures.

**Done when:** one complete PDF packet, signatures the only thing missing, plus a one-line verdict on whether the drug's safety sheet creates a problem.

---

## 2. Write the bacteria test protocol, on paper

**Target: 15 November**, so it's ready the day lab access opens.

This is the experiment that decides whether the project's measurement works at all, and you can design the whole thing before touching a pipette.

The test: harmless lab *E. coli* in a 96-well plate with resazurin dye. Pink means the bacteria grew; blue means something stopped them. You'll run a dilution series of **pure purchased ciprofloxacin** — not reactor water — to find the lowest concentration the test can still detect.

Write down:

- **The dilution series.** It has to reach down to a few millionths of a gram per litre. Ciprofloxacin is far more potent against *E. coli* than the drug this project originally targeted, and the published minimum inhibitory concentrations for some species are around 2 to 5 micrograms per litre. If your dilutions stop short of that range the test will look like it failed when it didn't.
- **The plate layout**, well by well.
- **The five controls, on every plate:** bleach alone; bleach plus the neutralising chemical; the neutralising chemical alone; ammonium chloride alone; and dye with no bacteria at all. Any one of those can kill bacteria or shift the dye colour by itself and produce a convincing false result. The last one catches colour changes that have nothing to do with life.
- **Which chemical stops the chlorine reaction in a sample.** Compare sodium thiosulfate, sodium bisulfite and ascorbate on paper and pick one. This matters more than it sounds: the choice can change the answer, published labs disagree partly because of it, and once chosen both partners must use the same recipe on every sample forever.
- **The maximum acceptable leftover antibacterial strength** — the number the project will later be judged against. Write it down **with today's date, before any results exist.** Setting it after seeing results moves the goalposts, and a judge will ask when it was decided.

**Done when:** a protocol someone could follow without asking you a question, and the activity limit recorded with a date.

---

## 3. Build the simple model we have to beat

**Target: as soon as you have repository access.** Originally due 15 October.

This is the deliberately naive version: assume the water's antibacterial strength falls exactly in step with the ciprofloxacin concentration. No products, no chemistry — just a straight proportion.

It takes very little work, because the chemistry model already produces every number it needs. The reason it matters is structural: the project's central claim is that predicting the chemistry beats this simple assumption, and that comparison is only believable if the simple version was built *before* the results came in, rather than reconstructed afterwards to lose.

**Done when:** committed to the repository with a test, and it runs on the same conditions the chemistry model was validated against.

---

## 4. Replace the four borrowed numbers

**Target: 15 November.** Pure reading and arithmetic, no lab, no code review needed.

Four numbers in the model currently come from a weaker source than they should, and each is a question a judge can reasonably ask:

1. **The breakdown rates per chemical form.** Download the supporting information for Dodd 2005 — it's free on the publisher's site — and find Figure S7. It gives the real rates, replacing an assumption currently built into the model about how the molecule splits between its charge states.
2. **The chloramine breakdown constants.** Check them directly against Jafvert & Valentine 1992 rather than the secondary source they came from.
3. **The dichloramine constants.** These are currently copied out of a university thesis table. Trace them to the original paper and confirm them, including the unit conversion — a related page in this project once had per-hour numbers used as per-second, which made a result wrong by a factor of 3,600.
4. **How fast ciprofloxacin diffuses through water.** The model uses an educated estimate. Find a published value. This one isn't academic: that number sets the threshold the team used to choose which tubing to buy, so it's worth knowing whether the guess was good.

While you're in the literature, build **one table of the published measurements of leftover antibacterial strength after chlorination** — Jaén-Gil 2020 and Kennedy Neth 2019 are the two that matter. This table is what item 5 gets calibrated against, so it's a prerequisite, not a side quest.

**Done when:** each number has a citation and a note saying whether it changed and by how much, and the published-activity table is in the repository.

---

## 5. Draft the activity model from published numbers

**Target: 15 December.** Needs item 4 finished first.

This is the missing piece of the project, and the part that is properly yours. The chemistry model says which molecules are in the water. The activity model turns that into a predicted plate result: give each molecule a potency relative to ciprofloxacin, add them up, and express the total as "the equivalent amount of ciprofloxacin." The molecules to score are ciprofloxacin itself, N-chloro-cipro, and the two groups of downstream products the chemistry model tracks.

You can build and calibrate a first version entirely on published data, with no measurements of our own. The calibration target is a real and unexplained gap in Kennedy Neth's results: their chlorinated water stayed noticeably more antibacterial than the leftover ciprofloxacin alone could account for — roughly 0.4 in ultrapure water and 0.25 in wastewater, on their scale, above what the remaining drug explains. That gap is the entire premise of the project, stated in someone else's data. If your model reproduces it, the premise holds up.

Their figures were re-digitised from the original paper on 16 October and now carry standard deviations, so you can weight the fit properly rather than treating every point as equally certain. The file is in the repository under the published-data folder.

Start by assuming potencies simply add together, then note in your write-up that this is an assumption to be tested — published work has found both synergy and antagonism in antibiotic mixtures, so it may not hold.

**Done when:** the model runs on the published data, reproduces that gap within an error band you state explicitly, and lives in the repository with tests.

---

## What is deliberately not on this list

- **The optimiser** (the search for cheapest acceptable settings) is also yours, but it genuinely needs real measurements first. It's scheduled 10 January to 5 February.
- **Running** the bacteria test, booking lab time, and ordering supplies are all held back until the safety approval in item 1 lands.
- **The real-effluent sample** in March is yours too, and arranging a contact early wouldn't hurt, but it isn't urgent.

## If you want more than five

The Valley Water mini-grant application is unclaimed, pure paperwork, and has three unresolved blockers worth knowing: an individual isn't allowed to be the applicant, the published award cap contradicts itself between two official pages ($5,000 versus $10,000), and the volunteer hours in the current budget are carried over from the abandoned earlier version of the project and need re-estimating. See `valley-water-mini-grant-budget.md`.
