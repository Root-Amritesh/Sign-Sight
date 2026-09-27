# Active Context — Sign-Sight

> **Last updated:** Session 1 (initial scaffolding).

## Current Focus

**Phase: Step 1 — Project Scaffolding & Architecture (COMPLETE)**

All planning documents, Django scaffolding, ML pipeline structure, config files, and
test scaffolding have been created. The project is ready for Step 2 implementation work.

## Immediate Next Steps (Ordered)

### Step 2: Make It Run (Foundation)

1. **Fix docker-compose.yml** — Hand the patch (documented in `progress.md`) to the
   teammate. Backend can't use Docker until this is done.

2. **Download NSL-KDD** — Get `KDDTrain+.txt` and `KDDTest+.txt` from
   [unb.ca](https://www.unb.ca/cic/datasets/nsl.html), place in `datasets/`.

3. **Run migrations locally** — `python manage.py migrate` with SQLite (dev default).
   Verify the Alert and ModelMetadata tables exist.

4. **Run the test suite** — `pytest` should pass on all scaffolding tests. Fix any
   import issues from the scaffolding phase.

5. **Create Django superuser** — `python manage.py createsuperuser`. Verify Django
   admin loads at `/admin/` and shows Alert + ModelMetadata models.

6. **Verify API** — Start dev server, hit `/api/docs/` to see Swagger UI. Verify
   `/api/v1/alerts/` returns an empty list.

### Step 3: Train the Baseline Model (THRESHOLD T1–T4, T10)

7. **Write a training script** — `python -m sign_sight.train` that:
   - Loads NSL-KDD via `sign_sight.ingest.load_nsl_kdd`
   - Splits train/test (use the pre-split files, or 80/20 stratified)
   - Builds feature matrix via `sign_sight.features.build_feature_matrix`
   - Trains RandomForest via `sign_sight.models.train_model`
   - Evaluates via `sign_sight.models.evaluate_model`
   - Prints the EvaluationReport (P/R/FPR/AUC per class)
   - Saves model + preprocessor to `artifacts/`

8. **Record real metrics** — After training, paste the actual numbers into
   `progress.md`. No fabrication.

9. **Create ModelMetadata** — Via Django admin or a management command. Set
   `is_active=True`.

### Step 4: Wire Up Inference (THRESHOLD T5–T9)

10. **Implement `alerts/inference.py`** — Load the active model, run prediction,
    compute severity. Currently has the structure; flesh out with real model loading.

11. **Test the predict endpoint** — POST a feature vector to `/api/v1/predict/`,
    verify an Alert is created with correct category/confidence/severity.

12. **Test the SOC workflow** — Use Django admin to filter alerts by severity, update
    an analyst_verdict to TRUE_POSITIVE, add notes.

### Step 5: Polish & Document (Quality Bar)

13. **ruff check + ruff format** — Ensure all code passes.
14. **mypy** — Run with django-stubs, fix type errors.
15. **Update README** — Add real metrics, finalize setup instructions.
16. **Commit and tag v0.1.0.**

---

## Open Questions

- **docker-compose layout:** The compose file mounts `./backend:/app` but the Django
  project is at the repo root (not under `backend/`). The teammate needs to either
  change the mount to `.:/app` or we create a `backend/` symlink. Documented in
  `progress.md` as a patch item.

## Blockers

- **docker-compose.yml has multiple typos/bugs.** Must be fixed by teammate before
  Docker-based development works. **Not blocking local dev** (SQLite fallback works).

- **NSL-KDD dataset not downloaded yet.** Needed for Step 3 (training). Download
  manually from UNB.
