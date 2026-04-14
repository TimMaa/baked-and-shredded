# Android Offline Validation Checklist

Use this checklist to validate offline-first behavior in the Android runtime.

## Preconditions

1. Install dependencies: `npm install`
2. Build web assets: `npm run build`
3. Sync Capacitor project: `npx cap sync android`
4. Open Android Studio: `npx cap open android`
5. Launch emulator or attach a physical Android device

## Test Run Metadata

- Date:
- Tester:
- Device/Emulator:
- Android Version:
- App Version/Commit:

## A. Database Initialization

1. Uninstall the app from the device/emulator.
2. Install and launch the app.
3. Verify the app loads without crash on first launch.
4. Verify the initialization banner clears and no persistent DB error banner remains.

Expected result:
- App initializes local SQLite successfully on first launch.

## B. Exercise CRUD

1. Create a new exercise with valid muscle group points.
2. Edit the created exercise.
3. Delete the exercise.

Expected result:
- Create, edit, and delete all succeed and UI updates immediately.

## C. Workout + Plan CRUD

1. Create a workout on the Plans page.
2. Open workout details.
3. Add two or more exercises.
4. Reorder exercises using move up/down and drag-and-drop.
5. Remove one exercise.
6. Update workout name and description.
7. Delete the workout.

Expected result:
- All operations persist and no server/network dependency is required.

## D. Execute Session Lifecycle

1. Create a workout with at least two exercises and multiple sets.
2. Start a workout session in Execute.
3. Log several sets (expected and deviation).
4. Complete the session.

Expected result:
- Session starts, set logging works, session completion succeeds, and no local persistence errors are shown.

## E. History + Analytics

1. Open History after completing at least one session.
2. Verify Session Timeline rows appear.
3. Verify Workout Performance Breakdown and Exercise Deviation Hotspots render.
4. Switch range filters: all, 7, 30, 90 days.
5. Delete one session from history.

Expected result:
- Analytics and filtering render correctly; deleting a session updates timeline and aggregates.

## F. Persistence Across Restart

1. Create at least one exercise, one workout, and complete one session.
2. Fully close the app (force stop).
3. Relaunch the app.
4. Re-check Exercises, Plans, Execute selectable workouts, and History.

Expected result:
- All data remains available after restart.

## G. Offline Airplane Mode

1. Enable airplane mode.
2. Repeat key flows:
   - Exercise create/edit/delete
   - Workout create/edit/delete
   - Execute session start/log/complete
   - History viewing/filtering/deleting

Expected result:
- All workflows continue to work offline with no network dependency.

## H. Stress/Scale Smoke Test

1. Complete at least 20 sessions with multiple sets (can be generated quickly through short routines).
2. Open History and switch range filters repeatedly.

Expected result:
- History remains responsive and does not crash.

## Failure Log

- Issue:
- Steps to reproduce:
- Expected:
- Actual:
- Screenshot/Video:

## Sign-off

- [ ] Database initialization validated
- [ ] CRUD workflows validated
- [ ] Execute workflow validated
- [ ] History and analytics validated
- [ ] Restart persistence validated
- [ ] Airplane mode validated
- [ ] Scale smoke test validated
