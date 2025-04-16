// app.js - Gym Log Pro Logic (v2 - Incorporating Pagination, Search, Image Preview, Wellness, Plan Tabs)

document.addEventListener('DOMContentLoaded', () => {
    // --- Constants and State ---
    const WORKOUT_STORAGE_KEY = 'gymLogProWorkouts';
    const EXERCISE_STORAGE_KEY = 'gymLogProCustomExercises';
    const PR_STORAGE_KEY = 'gymLogProPersonalRecords';
    const WELLNESS_STORAGE_KEY = 'gymLogProWellnessData';
    const ITEMS_PER_PAGE = 15; // For pagination

    let allWorkouts = loadData(WORKOUT_STORAGE_KEY, []);
    let customExercises = loadData(EXERCISE_STORAGE_KEY, []);
    let personalRecords = loadData(PR_STORAGE_KEY, {});
    let wellnessData = loadData(WELLNESS_STORAGE_KEY, {});
    let allExercisesData = []; // Will hold structured data {name, image, muscles}
    let currentSort = { column: 'date', order: 'desc' };
    let currentPage = 1;
    let editingId = null;

    // --- DOM Elements ---
    // General
    const toastElement = document.getElementById('liveToast');
    const toastTitleElement = document.getElementById('toastTitle');
    const toastBodyElement = document.getElementById('toastBody');
    const toast = bootstrap.Toast.getOrCreateInstance(toastElement);
    const bottomNavButtons = document.querySelectorAll('#bottomNav button');
    const tabContents = document.querySelectorAll('.tab-content');

    // Log Tab
    const workoutForm = document.getElementById('workoutForm');
    const formTitle = document.getElementById('formTitle');
    const dateInput = document.getElementById('date');
    const muscleGroupsSelect = document.getElementById('muscleGroups');
    const exerciseSelect = document.getElementById('exercise');
    const exerciseImagePreview = document.getElementById('exerciseImagePreview');
    const previewImg = document.getElementById('previewImg');
    const previewText = document.getElementById('previewText');
    const setsContainer = document.getElementById('setsContainer');
    const addSetBtn = document.getElementById('addSetBtn');
    const notesInput = document.getElementById('notes');
    const submitBtn = document.getElementById('submitBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const editIdInput = document.getElementById('editId');
    const setsWarning = document.getElementById('setsWarning');
    const workoutTableBody = document.querySelector('#workoutTable tbody');
    const noDataMessage = document.getElementById('noDataMessage');
    const filterDateInput = document.getElementById('filterDate');
    const filterExerciseInput = document.getElementById('filterExercise');
    const filterMuscleGroupSelect = document.getElementById('filterMuscleGroup');
    const clearFiltersBtn = document.getElementById('clearFilters');
    const tableSearchInput = document.getElementById('tableSearchInput'); // Search Input
    const tableHeaders = document.querySelectorAll('#workoutTable th[data-column]');
    const paginationControls = document.getElementById('paginationControls'); // Pagination container

    // Plan Tab (Placeholders for dynamic loading if needed later)
    // const predefinedWorkoutsContainer = document.getElementById('predefinedWorkoutsContainer');

    // Dashboard Tab
    const dashboardPeriodSelect = document.getElementById('dashboardPeriodSelect');
    const statsExercises = document.getElementById('statsExercises');
    const statsSets = document.getElementById('statsSets');
    const statsReps = document.getElementById('statsReps');
    const statsAvgWeight = document.getElementById('statsAvgWeight');
    const statsTotalVolume = document.getElementById('statsTotalVolume');
    const weeklyAvgWorkouts = document.getElementById('weeklyAvgWorkouts');
    const weeklyAvgSets = document.getElementById('weeklyAvgSets');
    const weeklyAvgReps = document.getElementById('weeklyAvgReps');
    const weeklyAvgRepsPerSet = document.getElementById('weeklyAvgRepsPerSet');
    const weeklyAvgVolume = document.getElementById('weeklyAvgVolume');
    const personalRecordsList = document.getElementById('personalRecordsList');
    const noPrMessage = document.getElementById('noPrMessage');
    const d3MusclesChartContainer = document.getElementById('musclesWorkedChartContainer');
    const d3MusclesChartSvg = document.getElementById('d3MusclesChart');
    const noMuscleDataMessage = document.getElementById('noMuscleDataMessage');
    const d3VolumeChartDashSvg = document.getElementById('d3VolumeChartDash');
    const noVolumeDataMessage = document.getElementById('noVolumeDataMessage');
    const d3ProgressChartDashSvg = document.getElementById('d3ProgressChartDash');
    const progressExerciseSelectDash = document.getElementById('progressExerciseSelectDash');
    const noProgressDataMessage = document.getElementById('noProgressDataMessage');
    // Placeholders for new widget containers
    const frequencyCalendarWidget = document.getElementById('frequencyCalendarWidget');
    const wellnessCorrelationWidget = document.getElementById('wellnessCorrelationWidget');


    // Wellness Tab
    const wellnessForm = document.getElementById('wellnessForm');
    const wellnessDateInput = document.getElementById('wellnessDate');
    const wellnessCaloriesInput = document.getElementById('wellnessCalories');
    const wellnessProteinInput = document.getElementById('wellnessProtein');
    const wellnessWaterInput = document.getElementById('wellnessWater');
    const wellnessNutritionNotesInput = document.getElementById('wellnessNutritionNotes');
    const wellnessSleepInput = document.getElementById('wellnessSleep');
    const wellnessRatingSelect = document.getElementById('wellnessRating');
    const wellnessSorenessSelect = document.getElementById('wellnessSoreness');
    const wellnessRecoveryNotesInput = document.getElementById('wellnessRecoveryNotes');
    // const saveWellnessBtn = document.getElementById('saveWellnessBtn'); // Not needed if using form submit
    // const wellnessHistoryContainer = document.getElementById('wellnessHistoryContainer');

    // Settings Tab
    const newExerciseNameSettings = document.getElementById('newExerciseNameSettings');
    const addNewExerciseBtnSettings = document.getElementById('addNewExerciseBtnSettings');
    const existingExercisesListSettings = document.getElementById('existingExercisesListSettings');
    const noCustomExercisesMessage = document.getElementById('noCustomExercisesMessage');
    const backupDataBtnSettings = document.getElementById('backupDataBtnSettings');
    const restoreFileSettings = document.getElementById('restoreFileSettings');
    const exportCSVSettings = document.getElementById('exportCSVSettings');
    const exportTXTSettings = document.getElementById('exportTXTSettings');
    const exportPDFSettings = document.getElementById('exportPDFSettings');

    // --- Initialization ---
    async function initializeApp() {
        setupEventListeners();
        showTab('logTabContent');
        setDefaultDate();
        setWellnessDefaultDate();
        await loadExercisesData(); // Load structured exercises
        populateExerciseDropdown([]); // Initial empty population (filtered later)
        populateMuscleGroupFilter();
        renderWorkoutTable();
        updateDashboard();
        renderCustomExercisesList();
        resetForm(); // Add initial empty set row
    }

    // --- Data Handling ---
    function loadData(key, defaultValue) {
        try {
            const data = localStorage.getItem(key);
            // Basic data validation/migration could happen here if needed
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error(`Error loading data for key "${key}":`, e);
            showToast('Eroare', `Nu s-au putut încărca datele (${key}).`, 'danger');
            return defaultValue;
        }
    }

    function saveData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error(`Error saving data for key "${key}":`, e);
            showToast('Eroare Salvare', 'Nu s-au putut salva datele (posibil spațiu insuficient).', 'danger');
        }
    }

    async function loadExercisesData() {
        try {
            // *** IMPORTANT: Change this to 'exercises_v2.json' or your structured file name ***
            const response = await fetch('exercises_v2.json'); // Assumes structured JSON exists
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allExercisesData = await response.json();
            // Ensure data has expected structure (basic check)
            if (!Array.isArray(allExercisesData) || (allExercisesData.length > 0 && !allExercisesData[0].name)) {
                 throw new Error("Format JSON exerciții invalid.");
            }
            allExercisesData.sort((a, b) => a.name.localeCompare(b.name)); // Sort by name
            console.log("Structured exercises loaded:", allExercisesData.length);
            populateDashboardExerciseSelect(); // Populate dashboard select after loading
        } catch (error) {
            console.error('Error loading structured exercises:', error);
            showToast('Eroare Încărcare Exerciții', 'Nu s-a putut încărca lista structurată de exerciții.', 'warning');
            allExercisesData = [{ name: "Bench Press", image: "", muscles: ["Piept"] }]; // Basic fallback
        }
    }


    // --- UI Functions ---
    function showToast(title, message, type = 'success') {
        // Simple implementation, replace with bootstrap if preferred
        // console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
        if (!toastElement) return; // Safety check
        toastTitleElement.textContent = title;
        toastBodyElement.innerHTML = message; // Use innerHTML to allow basic formatting if needed

        // Reset classes using Bootstrap 5 class names
        toastElement.classList.remove('text-bg-success', 'text-bg-warning', 'text-bg-danger', 'text-bg-info', 'text-bg-primary', 'text-bg-secondary', 'text-bg-light', 'text-bg-dark');
        let bgClass = 'text-bg-secondary'; // Default
        switch (type) {
            case 'success': bgClass = 'text-bg-success'; break;
            case 'warning': bgClass = 'text-bg-warning'; break;
            case 'danger': bgClass = 'text-bg-danger'; break;
            case 'info': bgClass = 'text-bg-info'; break;
            case 'primary': bgClass = 'text-bg-primary'; break;
        }
        toastElement.classList.add(bgClass);
        toast.show();
    }

    function setDefaultDate() {
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    }

    function setWellnessDefaultDate() {
        if (wellnessDateInput) wellnessDateInput.value = new Date().toISOString().split('T')[0];
        loadWellnessDataForDate();
    }

    // Populates the exercise dropdown based on filtered list
    function populateExerciseDropdown(exercisesToPopulate) {
        const currentExerciseValue = exerciseSelect.value;
        exerciseSelect.innerHTML = ''; // Clear existing

        if (exercisesToPopulate.length === 0 && !exerciseSelect.disabled) {
            const defaultOption = createOption("", "Niciun exercițiu relevant...", true, true);
            exerciseSelect.appendChild(defaultOption);
            exerciseSelect.disabled = true;
        } else if (exerciseSelect.disabled) {
            const defaultOption = createOption("", "Selectați întâi grupa musculară...", true, true);
            exerciseSelect.appendChild(defaultOption);
        } else {
            const defaultOption = createOption("", "Alegeți exercițiul...", true, true);
            exerciseSelect.appendChild(defaultOption);

            exercisesToPopulate.forEach(exercise => {
                const option = createOption(exercise.name, exercise.name);
                option.dataset.imageUrl = exercise.image || '';
                option.dataset.exerciseId = exercise.id || exercise.name; // Use name as fallback ID
                exerciseSelect.appendChild(option);
            });

            // Restore selection if possible
            if (exercisesToPopulate.some(ex => ex.name === currentExerciseValue)) {
                exerciseSelect.value = currentExerciseValue;
                // Trigger change manually after a short delay for image preview
                setTimeout(() => exerciseSelect.dispatchEvent(new Event('change')), 50);
            }
        }
         if(exerciseSelect.value === "") resetImagePreview(); // Reset preview if default is selected
    }

    // Populates the dashboard exercise selector
    function populateDashboardExerciseSelect() {
        progressExerciseSelectDash.innerHTML = '<option value="">Alege un exercițiu...</option>'; // Reset
        // Use only exercises that actually exist in the log for progress tracking
        const uniqueExercisesInLog = [...new Set(allWorkouts.map(w => w.exercise))].sort();
        uniqueExercisesInLog.forEach(exName => {
             progressExerciseSelectDash.appendChild(createOption(exName, exName));
        });
    }


    function populateMuscleGroupFilter() {
        const muscleGroups = [...new Set(allWorkouts.flatMap(w => w.muscleGroups))].sort();
        filterMuscleGroupSelect.innerHTML = '<option value="">Filtrează grupă...</option>';
        muscleGroups.forEach(group => {
            filterMuscleGroupSelect.appendChild(createOption(group, group));
        });
    }

     function createOption(value, text, disabled = false, selected = false) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        option.disabled = disabled;
        option.selected = selected;
        return option;
    }


    function resetForm() {
        if (!workoutForm) return;
        workoutForm.reset();
        workoutForm.classList.remove('was-validated');
        setDefaultDate();
        if (muscleGroupsSelect) muscleGroupsSelect.selectedIndex = -1;
        if (exerciseSelect) {
            exerciseSelect.innerHTML = ''; // Clear options
            const defaultOption = createOption("", "Selectați întâi grupa musculară...", true, true);
            exerciseSelect.appendChild(defaultOption);
            exerciseSelect.disabled = true; // Disable initially
        }
        if (setsContainer) setsContainer.innerHTML = '';
        addSetRow(); // Add one empty set row back
        if (notesInput) notesInput.value = '';
        editingId = null;
        if (editIdInput) editIdInput.value = '';
        if (formTitle) formTitle.textContent = 'Adaugă Exercițiu';
        if (submitBtn) submitBtn.textContent = 'Salvează';
        if (cancelEditBtn) cancelEditBtn.classList.add('d-none');
        if (setsWarning) setsWarning.classList.add('d-none');
        resetImagePreview();
    }

     function resetImagePreview() {
        if (previewImg) {
            previewImg.src = '';
            previewImg.style.display = 'none';
            previewImg.onerror = null; // Clear previous error handler
        }
        if (previewText) {
             if (exerciseSelect && exerciseSelect.disabled) {
                 previewText.textContent = "Selectați o grupă musculară întâi.";
            } else {
                previewText.textContent = "Selectați un exercițiu pentru a vedea imaginea.";
            }
            previewText.style.display = 'block';
        }
    }

    function addSetRow(reps = '', weight = '') {
        if (!setsContainer) return;
        const setDiv = document.createElement('div');
        setDiv.classList.add('row', 'g-2', 'mb-2', 'set-row', 'align-items-center');
        // Simplified input validation feedback directly on elements
        setDiv.innerHTML = `
            <div class="col">
                <input type="number" class="form-control form-control-sm reps-input" placeholder="Rep." min="0" value="${reps}" required title="Număr repetări (minim 0)">
            </div>
            <div class="col">
                <input type="number" class="form-control form-control-sm weight-input" placeholder="Kg" min="0" step="0.01" value="${weight}" required title="Greutate (minim 0)">
            </div>
            <div class="col-auto">
                <button type="button" class="btn btn-outline-danger btn-sm remove-set-btn" title="Șterge Set"><i class="bi bi-x-lg"></i></button>
            </div>
        `;
        setsContainer.appendChild(setDiv);

        const removeBtn = setDiv.querySelector('.remove-set-btn');
        if(removeBtn) removeBtn.addEventListener('click', () => {
            // Prevent removing the last set row
            if (setsContainer.children.length > 1) {
                setDiv.remove();
                validateSets(); // Re-validate after removal
            } else {
                showToast('Atenție', 'Trebuie să existe cel puțin un set.', 'warning');
            }
        });

        // Add validation listeners for the new inputs
        setDiv.querySelectorAll('.reps-input, .weight-input').forEach(input => {
             input.addEventListener('input', validateSets);
         });
         validateSets(); // Initial validation check
    }

     function validateSets() {
         if (!setsContainer || !setsWarning) return true; // Assume valid if elements don't exist
         const setRows = setsContainer.querySelectorAll('.set-row');
         let hasAtLeastOneValidSet = false;
         let allRowsArePotentiallyValid = true; // Check if any row has invalid input *values*

         if (setRows.length === 0) {
             allRowsArePotentiallyValid = false; // No sets is invalid for submission
         } else {
             setRows.forEach(row => {
                 const repsInput = row.querySelector('.reps-input');
                 const weightInput = row.querySelector('.weight-input');
                 const repsValue = repsInput.value;
                 const weightValue = weightInput.value;

                 const reps = parseInt(repsValue, 10);
                 const weight = parseFloat(weightValue);

                 // Check if values are entered and are valid numbers >= 0
                 const isRowValid = repsValue !== '' && !isNaN(reps) && reps >= 0 &&
                                   weightValue !== '' && !isNaN(weight) && weight >= 0;

                 if (isRowValid) {
                     hasAtLeastOneValidSet = true;
                      // Remove validation classes if valid
                     repsInput.classList.remove('is-invalid');
                     weightInput.classList.remove('is-invalid');
                 } else {
                      // Mark as invalid only if there's *some* input, otherwise just visually incomplete
                     if (repsValue !== '' && (isNaN(reps) || reps < 0)) {
                         repsInput.classList.add('is-invalid');
                         allRowsArePotentiallyValid = false;
                     } else {
                         repsInput.classList.remove('is-invalid');
                     }
                     if (weightValue !== '' && (isNaN(weight) || weight < 0)) {
                         weightInput.classList.add('is-invalid');
                         allRowsArePotentiallyValid = false;
                     } else {
                          weightInput.classList.remove('is-invalid');
                     }
                     // If both are empty, it's just incomplete, not strictly invalid yet unless submitting
                      if(repsValue === '' || weightValue === ''){
                          // Don't automatically mark empty as invalid, wait for form submission check
                      } else {
                          // If both have values but one is invalid, it's invalid
                          if(!isRowValid) allRowsArePotentiallyValid = false;
                      }
                 }
             });
         }

         // Show general warning only if submission is attempted OR if invalid values exist
         // Let Bootstrap handle individual field highlighting on submit
         if (!hasAtLeastOneValidSet && setRows.length > 0) {
            setsWarning.classList.remove('d-none');
         } else {
             setsWarning.classList.add('d-none');
         }

         return hasAtLeastOneValidSet && allRowsArePotentiallyValid; // Return true only if ready for submit
     }


    function getSetsData() {
        const sets = [];
        const setRows = setsContainer.querySelectorAll('.set-row');
        setRows.forEach(row => {
            const repsInput = row.querySelector('.reps-input');
            const weightInput = row.querySelector('.weight-input');
            // Ensure values are not empty strings before parsing
            if (repsInput.value !== '' && weightInput.value !== '') {
                 const reps = parseInt(repsInput.value, 10);
                 const weight = parseFloat(weightInput.value);
                 // Add only if parsing was successful and values are non-negative
                 if (!isNaN(reps) && reps >= 0 && !isNaN(weight) && weight >= 0) {
                    sets.push({ reps, weight });
                }
            }
        });
        return sets;
    }

    function renderWorkoutTable() {
        if (!workoutTableBody || !paginationControls) return; // Safety check
        workoutTableBody.innerHTML = ''; // Clear existing rows
        paginationControls.innerHTML = ''; // Clear pagination

        const filteredWorkouts = filterAndSortWorkouts();
        const totalItems = filteredWorkouts.length;
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

        // Ensure currentPage is valid
        if(currentPage > totalPages && totalPages > 0) currentPage = totalPages;
        if(currentPage < 1) currentPage = 1;

        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const paginatedWorkouts = filteredWorkouts.slice(startIndex, endIndex);


        if (paginatedWorkouts.length === 0) {
            noDataMessage.classList.remove('d-none');
            workoutTableBody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-3">${totalItems > 0 ? 'Nicio înregistrare pe această pagină.' : 'Nu s-au găsit înregistrări conform filtrelor.'}</td></tr>`;
        } else {
            noDataMessage.classList.add('d-none');
            paginatedWorkouts.forEach(workout => {
                const row = workoutTableBody.insertRow();
                row.dataset.id = workout.id;

                const sets = workout.sets || []; // Handle case where sets might be missing/undefined
                const totalReps = sets.reduce((sum, set) => sum + (set.reps || 0), 0);
                const validSetsForAvgWeight = sets.filter(set => typeof set.weight === 'number'); // Avoid NaN
                const totalWeightSum = validSetsForAvgWeight.reduce((sum, set) => sum + set.weight, 0);
                const avgWeight = validSetsForAvgWeight.length > 0 ? (totalWeightSum / validSetsForAvgWeight.length) : 0;
                const volume = calculateVolume([workout]);
                const maxE1RM = calculateMaxE1RM(sets);
                const isPR = checkForPR(workout.exercise, maxE1RM, workout.date); // Check PR based on e1rm and date


                row.innerHTML = `
                    <td>${formatDate(workout.date)}</td>
                    <td>${escapeHtml(workout.exercise)} ${isPR ? '<span class="pr-indicator" title="Record Personal (e1RM) stabilit la această dată!"><i class="bi bi-star-fill"></i></span>' : ''}</td>
                    <td><small>${Array.isArray(workout.muscleGroups) ? escapeHtml(workout.muscleGroups.join(', ')) : ''}</small></td>
                    <td class="text-center">${sets.length}</td>
                    <td class="text-center d-none d-md-table-cell">${totalReps}</td>
                    <td class="text-center">${avgWeight.toFixed(1)} kg</td>
                    <td class="text-end">${volume.toFixed(1)} kg</td>
                    <td class="text-end d-none d-lg-table-cell">${maxE1RM.toFixed(1)} kg</td>
                    <td class="d-none d-lg-table-cell"><small title="${escapeHtml(workout.notes || '')}">${workout.notes ? escapeHtml(workout.notes.substring(0, 30)) + (workout.notes.length > 30 ? '...' : '') : '-'}</small></td>
                    <td class="text-nowrap">
                        <button class="btn btn-sm btn-outline-primary edit-btn" title="Editează"><i class="bi bi-pencil-fill"></i></button>
                        <button class="btn btn-sm btn-outline-danger delete-btn" title="Șterge"><i class="bi bi-trash-fill"></i></button>
                    </td>
                `;
            });
        }
        renderPaginationControls(totalItems, totalPages);
        addTableActionListeners();
        updateSortIcons(); // Update icons after rendering
    }

    function renderPaginationControls(totalItems, totalPages) {
         if (!paginationControls) return;
         paginationControls.innerHTML = ''; // Clear existing

         if (totalPages <= 1) return; // No controls needed for 1 page or less

         const paginationUl = document.createElement('ul');
         paginationUl.classList.add('pagination', 'pagination-sm');

         // Previous Button
         const prevLi = document.createElement('li');
         prevLi.classList.add('page-item', currentPage === 1 ? 'disabled' : '');
         const prevLink = document.createElement('a');
         prevLink.classList.add('page-link');
         prevLink.href = '#';
         prevLink.innerHTML = '«';
         prevLink.addEventListener('click', (e) => {
             e.preventDefault();
             if (currentPage > 1) {
                 currentPage--;
                 renderWorkoutTable();
             }
         });
         prevLi.appendChild(prevLink);
         paginationUl.appendChild(prevLi);

         // Page Number Buttons (simplified version: show current page and neighbors)
        const maxPagesToShow = 5; // Adjust as needed
        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

        // Adjust startPage if endPage reaches the limit first
         if(endPage === totalPages){
             startPage = Math.max(1, endPage - maxPagesToShow + 1);
         }


        if (startPage > 1) {
             const firstLi = document.createElement('li');
             firstLi.classList.add('page-item');
             const firstLink = document.createElement('a');
             firstLink.classList.add('page-link');
             firstLink.href = '#';
             firstLink.textContent = '1';
             firstLink.addEventListener('click', (e) => { e.preventDefault(); currentPage = 1; renderWorkoutTable(); });
             firstLi.appendChild(firstLink);
             paginationUl.appendChild(firstLi);
             if (startPage > 2) {
                const ellipsisLi = document.createElement('li');
                ellipsisLi.classList.add('page-item', 'disabled');
                ellipsisLi.innerHTML = '<span class="page-link">...</span>';
                paginationUl.appendChild(ellipsisLi);
             }
         }


        for (let i = startPage; i <= endPage; i++) {
            const pageLi = document.createElement('li');
            pageLi.classList.add('page-item', i === currentPage ? 'active' : '');
            const pageLink = document.createElement('a');
            pageLink.classList.add('page-link');
            pageLink.href = '#';
            pageLink.textContent = i;
            pageLink.addEventListener('click', (e) => {
                e.preventDefault();
                currentPage = i;
                renderWorkoutTable();
            });
            pageLi.appendChild(pageLink);
            paginationUl.appendChild(pageLi);
        }

        if (endPage < totalPages) {
             if (endPage < totalPages - 1) {
                const ellipsisLi = document.createElement('li');
                ellipsisLi.classList.add('page-item', 'disabled');
                ellipsisLi.innerHTML = '<span class="page-link">...</span>';
                paginationUl.appendChild(ellipsisLi);
             }
            const lastLi = document.createElement('li');
            lastLi.classList.add('page-item');
            const lastLink = document.createElement('a');
            lastLink.classList.add('page-link');
            lastLink.href = '#';
            lastLink.textContent = totalPages;
             lastLink.addEventListener('click', (e) => { e.preventDefault(); currentPage = totalPages; renderWorkoutTable(); });
            lastLi.appendChild(lastLink);
            paginationUl.appendChild(lastLi);
        }


         // Next Button
         const nextLi = document.createElement('li');
         nextLi.classList.add('page-item', currentPage === totalPages ? 'disabled' : '');
         const nextLink = document.createElement('a');
         nextLink.classList.add('page-link');
         nextLink.href = '#';
         nextLink.innerHTML = '»';
         nextLink.addEventListener('click', (e) => {
             e.preventDefault();
             if (currentPage < totalPages) {
                 currentPage++;
                 renderWorkoutTable();
             }
         });
         nextLi.appendChild(nextLink);
         paginationUl.appendChild(nextLi);

         paginationControls.appendChild(paginationUl);
    }


    function addTableActionListeners() {
        // Use event delegation on the table body for efficiency
        if (!workoutTableBody) return;
        workoutTableBody.removeEventListener('click', handleTableActions); // Remove old listener first
        workoutTableBody.addEventListener('click', handleTableActions);
    }

    function showTab(tabId) {
        tabContents.forEach(tab => {
            tab.classList.remove('active');
            tab.style.display = 'none'; // Use display none for better performance
        });
        bottomNavButtons.forEach(btn => {
            btn.classList.remove('active');
        });

        const activeTab = document.getElementById(tabId);
        const activeButton = document.querySelector(`#bottomNav button[data-target="${tabId}"]`);

        if (activeTab) {
            activeTab.classList.add('active');
            activeTab.style.display = 'block';
             // Scroll to top of tab content
             activeTab.scrollTop = 0;
             document.documentElement.scrollTop = 0; // Scroll window too
        }
        if (activeButton) activeButton.classList.add('active');

        // Refresh dynamic content
        switch (tabId) {
            case 'dashboardTabContent':
                updateDashboard();
                break;
            case 'settingsTabContent':
                renderCustomExercisesList();
                break;
            case 'logTabContent':
                renderWorkoutTable(); // Re-render table if filters/data changed
                populateMuscleGroupFilter();
                // Re-trigger muscle group check to potentially repopulate exercise list
                handleMuscleGroupChange();
                break;
            case 'wellnessTabContent':
                setWellnessDefaultDate(); // Set to today and load data
                break;
            // case 'planTabContent': // Static for now, no refresh needed
            //     break;
        }
    }

     function updateSortIcons() {
         if(!tableHeaders) return;
         tableHeaders.forEach(header => {
             const icon = header.querySelector('.sort-icon');
             if (!icon) return;
             icon.classList.remove('bi-sort-up-alt', 'bi-sort-down', 'bi-filter'); // Clear icons
             if (header.dataset.column === currentSort.column) {
                 icon.classList.add(currentSort.order === 'asc' ? 'bi-sort-up-alt' : 'bi-sort-down');
             } else {
                 // Optionally show a generic sort icon for clickable headers
                 // icon.classList.add('bi-filter'); // Example placeholder
             }
         });
     }

    // --- Calculations ---
    function calculateVolume(workoutArray) {
        return workoutArray.reduce((totalVol, workout) => {
            const entryVol = (workout.sets || []).reduce((vol, set) => {
                // Ensure reps and weight are numbers before multiplying
                const reps = typeof set.reps === 'number' ? set.reps : 0;
                const weight = typeof set.weight === 'number' ? set.weight : 0;
                return vol + (reps * weight);
            }, 0);
            return totalVol + entryVol;
        }, 0);
    }

    function calculateE1RM(weight, reps) {
        if (typeof weight !== 'number' || typeof reps !== 'number' || reps <= 0 || weight < 0) return 0;
        if (reps === 1) return weight;
        const denominator = 1.0278 - (0.0278 * reps);
        return denominator > 0 ? weight / denominator : 0;
    }

    function calculateMaxE1RM(sets) {
        if (!Array.isArray(sets) || sets.length === 0) return 0;
        return Math.max(0, ...sets.map(set => calculateE1RM(set.weight, set.reps)));
    }

    function updatePersonalRecords(exercise, sets, workoutDate) {
         if (!exercise || !Array.isArray(sets) || sets.length === 0 || !workoutDate) return false;

         const currentMaxE1RM = calculateMaxE1RM(sets);
         let recordUpdated = false;

         if (!personalRecords[exercise]) {
             personalRecords[exercise] = { e1rm: 0, date: '' };
         }
         const record = personalRecords[exercise];

         // Update PR only if the new e1RM is significantly higher (avoid floating point issues)
         // And only if the date is the same or newer than the existing record date
         if (currentMaxE1RM > record.e1rm + 0.01 && (!record.date || workoutDate >= record.date)) {
            record.e1rm = currentMaxE1RM;
            record.date = workoutDate;
            recordUpdated = true;
            saveData(PR_STORAGE_KEY, personalRecords);
            console.log(`PR updated for ${exercise}: ${currentMaxE1RM.toFixed(1)} kg on ${workoutDate}`);
         } else if (currentMaxE1RM >= record.e1rm - 0.01 && workoutDate > record.date) {
             // If e1RM is the same but date is newer, update the date
             record.date = workoutDate;
             recordUpdated = true; // Technically record date updated
             saveData(PR_STORAGE_KEY, personalRecords);
         }

         return recordUpdated && currentMaxE1RM > 0; // Return true only if a meaningful PR was set/updated
     }

     // Checks if the given workout entry's date matches the PR date for that exercise's e1RM
     function checkForPR(exercise, entryMaxE1RM, entryDate) {
         const record = personalRecords[exercise];
         // Check if a record exists, the entry's e1RM matches the record's e1RM (within tolerance),
         // and the entry's date matches the record's date.
         return record &&
                record.date === entryDate &&
                Math.abs(record.e1rm - entryMaxE1RM) < 0.01;
     }

    // --- Event Handlers ---
    function setupEventListeners() {
        // Tab Navigation
        bottomNavButtons.forEach(button => {
            button.addEventListener('click', (e) => showTab(e.currentTarget.dataset.target));
        });

        // Log Form
        if(workoutForm) workoutForm.addEventListener('submit', handleWorkoutFormSubmit);
        if(addSetBtn) addSetBtn.addEventListener('click', () => addSetRow());
        if(cancelEditBtn) cancelEditBtn.addEventListener('click', resetForm);
        if(muscleGroupsSelect) muscleGroupsSelect.addEventListener('change', handleMuscleGroupChange);
        if(exerciseSelect) exerciseSelect.addEventListener('change', handleExerciseChange);
        // Set validation delegated in addSetRow

        // Log Filters & Search
        if(filterDateInput) filterDateInput.addEventListener('input', handleFilterChange);
        if(filterExerciseInput) filterExerciseInput.addEventListener('input', handleFilterChange);
        if(filterMuscleGroupSelect) filterMuscleGroupSelect.addEventListener('change', handleFilterChange);
        if(tableSearchInput) tableSearchInput.addEventListener('input', handleFilterChange); // Search triggers filter change
        if(clearFiltersBtn) clearFiltersBtn.addEventListener('click', handleClearFilters);

        // Log Table Sorting
        if(tableHeaders) tableHeaders.forEach(header => {
            header.addEventListener('click', handleSort);
        });

        // Dashboard
        if(dashboardPeriodSelect) dashboardPeriodSelect.addEventListener('change', updateDashboard);
        if(progressExerciseSelectDash) progressExerciseSelectDash.addEventListener('change', () => renderProgressChart(progressExerciseSelectDash.value));

        // Wellness Form
        if(wellnessForm) wellnessForm.addEventListener('submit', handleWellnessFormSubmit);
        if(wellnessDateInput) wellnessDateInput.addEventListener('change', loadWellnessDataForDate);

        // Settings
        if(addNewExerciseBtnSettings) addNewExerciseBtnSettings.addEventListener('click', handleAddCustomExercise);
        if(existingExercisesListSettings) existingExercisesListSettings.addEventListener('click', handleDeleteCustomExercise); // Use delegation
        if(backupDataBtnSettings) backupDataBtnSettings.addEventListener('click', handleBackupData);
        if(restoreFileSettings) restoreFileSettings.addEventListener('change', handleRestoreData);
        if(exportCSVSettings) exportCSVSettings.addEventListener('click', () => handleExportData('csv'));
        if(exportTXTSettings) exportTXTSettings.addEventListener('click', () => handleExportData('txt'));
        if(exportPDFSettings) exportPDFSettings.addEventListener('click', () => handleExportData('pdf'));

        // Table actions (Edit/Delete) are handled via delegation in addTableActionListeners
    }

    // --- Log Tab Handlers ---

    function handleWorkoutFormSubmit(event) {
        event.preventDefault();
        event.stopPropagation();

        const sets = getSetsData(); // Get current sets data

        // Validate sets manually before Bootstrap validation
        let setsAreValid = true;
        if (sets.length === 0) {
             setsAreValid = false;
             showToast('Eroare', 'Adăugați cel puțin un set valid (Rep. și Kg >= 0).', 'warning');
             if(setsWarning) setsWarning.classList.remove('d-none');
             return
        } else {
             // Check if any entered set is incomplete or invalid
             let incompleteOrInvalid = false;
             setsContainer.querySelectorAll('.set-row').forEach(row => {
                 const r = row.querySelector('.reps-input').value;
                 const w = row.querySelector('.weight-input').value;
                 if( (r === '' || w === '') || parseInt(r)<0 || parseFloat(w)<0 || isNaN(parseInt(r)) || isNaN(parseFloat(w)) ){
                     incompleteOrInvalid = true;
                 }
             });
             if(incompleteOrInvalid){
                 setsAreValid = false;
                 showToast('Eroare', 'Verificați seturile. Completați Rep. și Kg cu valori >= 0.', 'warning');
                 if(setsWarning) setsWarning.classList.remove('d-none');
                 return;
             }
        }
        if(setsWarning) setsWarning.classList.add('d-none'); // Hide warning if sets seem ok


        if (!workoutForm.checkValidity()) {
            workoutForm.classList.add('was-validated');
            showToast('Eroare', 'Completați câmpurile obligatorii (Data, Grupe, Exercițiu).', 'warning');
            return;
        }

        const workoutEntry = {
            id: editingId || generateId(),
            date: dateInput.value,
            muscleGroups: Array.from(muscleGroupsSelect.selectedOptions).map(opt => opt.value),
            exercise: exerciseSelect.value,
            sets: sets, // Use the validated sets
            notes: notesInput.value.trim()
        };

        let prSet = updatePersonalRecords(workoutEntry.exercise, workoutEntry.sets, workoutEntry.date);

        if (editingId) {
            const index = allWorkouts.findIndex(w => w.id === editingId);
            if (index > -1) {
                allWorkouts[index] = workoutEntry;
                showToast('Succes', 'Antrenament actualizat.');
            }
        } else {
            allWorkouts.push(workoutEntry);
            showToast('Succes', `Antrenament adăugat.${prSet ? ' Ai stabilit un nou Record Personal!' : ''}`);
        }

        saveData(WORKOUT_STORAGE_KEY, allWorkouts);
        // Note: PRs are saved inside updatePersonalRecords
        resetForm();
        currentPage = 1; // Go to first page after adding/editing
        renderWorkoutTable();
        updateDashboard();
        populateMuscleGroupFilter();
        populateDashboardExerciseSelect(); // Update dashboard select too
    }

    function handleTableActions(event) {
        const target = event.target;
        const editButton = target.closest('.edit-btn');
        const deleteButton = target.closest('.delete-btn');
        const row = target.closest('tr');

        if (!row || !row.dataset.id) return;
        const id = row.dataset.id;

        if (editButton) {
            handleEdit(id);
        } else if (deleteButton) {
            handleDelete(id);
        }
    }


    function handleEdit(idOrEvent) {
         // Can be called directly with ID or from event listener
         const id = typeof idOrEvent === 'string' ? idOrEvent : idOrEvent.target.closest('tr').dataset.id;
         const workout = allWorkouts.find(w => w.id === id);
         if (!workout) {
            showToast('Eroare', 'Antrenamentul nu a fost găsit.', 'danger');
            return;
         }

         resetForm(); // Clear form first

         editingId = id;
         editIdInput.value = id;
         formTitle.textContent = 'Modifică Exercițiu';
         submitBtn.textContent = 'Actualizează';
         cancelEditBtn.classList.remove('d-none');

         dateInput.value = workout.date;

         // Select muscle groups
         Array.from(muscleGroupsSelect.options).forEach(option => {
             option.selected = Array.isArray(workout.muscleGroups) && workout.muscleGroups.includes(option.value);
         });
         // Trigger change to filter exercises
         muscleGroupsSelect.dispatchEvent(new Event('change'));

         // Select exercise - needs slight delay for dropdown population
         setTimeout(() => {
             exerciseSelect.value = workout.exercise;
             // Trigger change to show image preview
             if (exerciseSelect.value) {
                exerciseSelect.dispatchEvent(new Event('change'));
             }
         }, 100); // Delay might need adjustment

         notesInput.value = workout.notes || '';

         // Populate sets
         setsContainer.innerHTML = ''; // Clear default empty row
         (workout.sets || []).forEach(set => {
             addSetRow(set.reps, set.weight);
         });
         if(setsContainer.children.length === 0) addSetRow(); // Add one if none loaded

         validateSets(); // Validate loaded sets

         // Scroll form into view
         workoutForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
     }

     function handleDelete(idOrEvent) {
         const id = typeof idOrEvent === 'string' ? idOrEvent : idOrEvent.target.closest('tr').dataset.id;

         // Simple confirm dialog
         if (confirm('Sigur doriți să ștergeți această înregistrare?')) {
             allWorkouts = allWorkouts.filter(w => w.id !== id);
             saveData(WORKOUT_STORAGE_KEY, allWorkouts);
             showToast('Șters', 'Înregistrarea a fost ștearsă.', 'info');

             // If the deleted item was being edited, reset the form
             if (editingId === id) {
                 resetForm();
             }
             renderWorkoutTable(); // Re-render the current page
             updateDashboard();
             populateMuscleGroupFilter();
             populateDashboardExerciseSelect();
         }
     }

    function handleFilterChange() {
        currentPage = 1; // Reset to first page when filters change
        renderWorkoutTable();
    }

    function handleClearFilters() {
        filterDateInput.value = '';
        filterExerciseInput.value = '';
        filterMuscleGroupSelect.value = '';
        tableSearchInput.value = '';
        currentPage = 1;
        renderWorkoutTable();
        showToast('Filtre Resetate', 'Toate filtrele au fost șterse.', 'info');
    }

    function handleSort(event) {
        const header = event.currentTarget;
        const column = header.dataset.column;
        if (!column) return; // Not a sortable column

        if (currentSort.column === column) {
            currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.column = column;
            currentSort.order = 'desc'; // Default to descending for new column
        }
        currentPage = 1; // Reset to first page on sort
        renderWorkoutTable();
    }

    function handleMuscleGroupChange() {
        const selectedGroups = Array.from(muscleGroupsSelect.selectedOptions).map(option => option.value);
        let filtered = [];

        if (selectedGroups.length > 0) {
            exerciseSelect.disabled = false;
            if (selectedGroups.includes("Full Body")) {
                 filtered = [...allExercisesData]; // Show all if Full Body selected
            } else {
                filtered = allExercisesData.filter(exercise =>
                     Array.isArray(exercise.muscles) && exercise.muscles.some(muscle => selectedGroups.includes(muscle))
                );
            }
        } else {
            exerciseSelect.disabled = true;
        }
        populateExerciseDropdown(filtered);
    }

    function handleExerciseChange() {
        const selectedOption = exerciseSelect.options[exerciseSelect.selectedIndex];
        const imageUrl = selectedOption?.dataset?.imageUrl; // Optional chaining

        if (imageUrl) {
            previewImg.src = imageUrl;
            previewImg.style.display = 'block';
            previewText.style.display = 'none';
            previewImg.onerror = () => {
                console.warn(`Imaginea nu a putut fi încărcată: ${imageUrl}`);
                resetImagePreview();
                 previewText.textContent = 'Imaginea nu poate fi afișată.';
            };
        } else if (exerciseSelect.value) {
            resetImagePreview();
             previewText.textContent = 'Nu există imagine disponibilă.';
        } else {
            resetImagePreview();
        }
    }

    // --- Wellness Tab Handlers ---
    function loadWellnessDataForDate() {
        if (!wellnessDateInput || !wellnessData) return;
        const selectedDate = wellnessDateInput.value;
        const data = wellnessData[selectedDate] || {};

        // Populate form fields, using empty string as default if data[key] is null/undefined
        if(wellnessCaloriesInput) wellnessCaloriesInput.value = data.calories ?? '';
        if(wellnessProteinInput) wellnessProteinInput.value = data.protein ?? '';
        if(wellnessWaterInput) wellnessWaterInput.value = data.water ?? '';
        if(wellnessNutritionNotesInput) wellnessNutritionNotesInput.value = data.nutritionNotes || '';
        if(wellnessSleepInput) wellnessSleepInput.value = data.sleep ?? '';
        if(wellnessRatingSelect) wellnessRatingSelect.value = data.rating ?? '';
        if(wellnessSorenessSelect) wellnessSorenessSelect.value = data.soreness ?? '';
        if(wellnessRecoveryNotesInput) wellnessRecoveryNotesInput.value = data.recoveryNotes || '';
    }

    function handleWellnessFormSubmit(event) {
        event.preventDefault();
        if (!wellnessDateInput) return;
        const selectedDate = wellnessDateInput.value;
        if (!selectedDate) {
            showToast('Eroare', 'Selectați o dată pentru jurnalul wellness.', 'warning');
            return;
        }

        // Helper to parse numbers or return null
        const parseNumOrNull = (value) => {
            const num = parseFloat(value);
            return !isNaN(num) && value.trim() !== '' ? num : null;
        };
        const parseIntOrNull = (value) => {
             const num = parseInt(value, 10);
             return !isNaN(num) && value.trim() !== '' ? num : null;
         };

        const entryData = {
            calories: parseIntOrNull(wellnessCaloriesInput.value),
            protein: parseIntOrNull(wellnessProteinInput.value),
            water: parseNumOrNull(wellnessWaterInput.value),
            nutritionNotes: wellnessNutritionNotesInput.value.trim(),
            sleep: parseNumOrNull(wellnessSleepInput.value),
            rating: parseIntOrNull(wellnessRatingSelect.value),
            soreness: parseIntOrNull(wellnessSorenessSelect.value),
            recoveryNotes: wellnessRecoveryNotesInput.value.trim()
        };

        // Check if all fields are null or empty strings
        const isEmpty = Object.values(entryData).every(val => val === null || val === '');

        if (isEmpty) {
            // If an entry for this date exists, remove it
            if (wellnessData[selectedDate]) {
                delete wellnessData[selectedDate];
                showToast('Șters', `Intrarea wellness pentru ${formatDate(selectedDate)} a fost ștearsă (era goală).`, 'info');
            } else {
                 showToast('Info', 'Nu s-a salvat nimic (toate câmpurile goale).', 'info');
                 return; // Don't save an empty entry if it didn't exist before
            }
        } else {
            wellnessData[selectedDate] = entryData;
            showToast('Succes', `Jurnalul wellness pentru ${formatDate(selectedDate)} a fost salvat.`);
        }

        saveData(WELLNESS_STORAGE_KEY, wellnessData);
        // Optional: Update dashboard if wellness data is used there
        // updateDashboard();
    }

    // --- Settings Tab Handlers ---
    function handleAddCustomExercise() {
        const name = newExerciseNameSettings.value.trim();
        if (name) {
            const combinedList = [...allExercisesData.map(ex => ex.name), ...customExercises];
            if (!combinedList.some(ex => ex.toLowerCase() === name.toLowerCase())) {
                customExercises.push(name);
                customExercises.sort(); // Keep sorted
                saveData(EXERCISE_STORAGE_KEY, customExercises);
                renderCustomExercisesList();
                populateExerciseDropdown([]); // Repopulate main dropdown (needs re-filtering)
                populateDashboardExerciseSelect(); // Repopulate dashboard dropdown
                newExerciseNameSettings.value = '';
                showToast('Succes', `Exercițiul "${name}" a fost adăugat.`);
                // Trigger muscle group change to repopulate based on current selection
                handleMuscleGroupChange();
            } else {
                showToast('Eroare', 'Acest exercițiu există deja.', 'warning');
            }
        } else {
             showToast('Eroare', 'Introduceți un nume pentru exercițiu.', 'warning');
        }
    }

     function renderCustomExercisesList() {
        if (!existingExercisesListSettings || !noCustomExercisesMessage) return;
        existingExercisesListSettings.innerHTML = ''; // Clear list

        if (customExercises.length === 0) {
            noCustomExercisesMessage.classList.remove('d-none');
        } else {
            noCustomExercisesMessage.classList.add('d-none');
            customExercises.forEach(exercise => {
                const li = document.createElement('li');
                li.classList.add('list-group-item', 'list-group-item-sm');
                li.innerHTML = `
                    <span>${escapeHtml(exercise)}</span>
                    <button class="btn btn-outline-danger btn-sm delete-custom-exercise-btn" data-exercise="${escapeHtml(exercise)}" title="Șterge Exercițiu Custom">
                        <i class="bi bi-trash"></i>
                    </button>
                `;
                existingExercisesListSettings.appendChild(li);
            });
        }
    }

     function handleDeleteCustomExercise(event) {
         const deleteButton = event.target.closest('.delete-custom-exercise-btn');
         if (!deleteButton) return; // Click wasn't on a delete button

         const exerciseToDelete = deleteButton.dataset.exercise;
         if (exerciseToDelete && confirm(`Sigur doriți să ștergeți exercițiul personalizat "${exerciseToDelete}"?`)) {
             customExercises = customExercises.filter(ex => ex !== exerciseToDelete);
             saveData(EXERCISE_STORAGE_KEY, customExercises);
             renderCustomExercisesList();
             populateExerciseDropdown([]); // Repopulate main dropdown
             populateDashboardExerciseSelect();
             showToast('Șters', `Exercițiul "${exerciseToDelete}" a fost șters.`, 'info');
              // Trigger muscle group change to repopulate based on current selection
             handleMuscleGroupChange();
         }
     }


    function handleBackupData() {
        try {
             const backupData = {
                workouts: allWorkouts,
                customExercises: customExercises,
                personalRecords: personalRecords,
                wellnessData: wellnessData,
                backupVersion: 1 // Optional: versioning for future migrations
            };
            const jsonString = JSON.stringify(backupData, null, 2); // Pretty print JSON
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
            a.href = url;
            a.download = `gym_log_pro_backup_${timestamp}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Backup Creat', 'Fișierul JSON de backup a fost descărcat.', 'success');
        } catch (error) {
            console.error("Backup error:", error);
             showToast('Eroare Backup', 'Nu s-a putut crea fișierul de backup.', 'danger');
        }
    }

    function handleRestoreData(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!confirm("Restaurarea va suprascrie toate datele curente. Sigur doriți să continuați?")) {
            restoreFileSettings.value = ''; // Reset file input
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const restoredData = JSON.parse(e.target.result);

                // Basic validation of the restored data structure
                if (typeof restoredData === 'object' && restoredData !== null &&
                    Array.isArray(restoredData.workouts) &&
                    Array.isArray(restoredData.customExercises) &&
                    typeof restoredData.personalRecords === 'object' && // Allow null/empty object
                    typeof restoredData.wellnessData === 'object') { // Allow null/empty object

                     // Assign data - ensure defaults if keys are missing in older backups
                     allWorkouts = restoredData.workouts || [];
                     customExercises = restoredData.customExercises || [];
                     personalRecords = restoredData.personalRecords || {};
                     wellnessData = restoredData.wellnessData || {};


                    // Save restored data
                    saveData(WORKOUT_STORAGE_KEY, allWorkouts);
                    saveData(EXERCISE_STORAGE_KEY, customExercises);
                    saveData(PR_STORAGE_KEY, personalRecords);
                    saveData(WELLNESS_STORAGE_KEY, wellnessData);

                    // Refresh UI completely
                    currentPage = 1; // Reset pagination
                    renderWorkoutTable();
                    updateDashboard();
                    renderCustomExercisesList();
                    populateMuscleGroupFilter();
                     populateExerciseDropdown([]); // Repopulate
                    handleMuscleGroupChange(); // Trigger filtering
                    populateDashboardExerciseSelect();
                    loadWellnessDataForDate(); // Load wellness for current date

                    showToast('Restaurare Completă', 'Datele au fost restaurate cu succes.', 'success');
                } else {
                    throw new Error("Fișierul de backup are un format invalid.");
                }
            } catch (error) {
                console.error("Restore error:", error);
                showToast('Eroare Restaurare', `Nu s-au putut restaura datele: ${error.message}`, 'danger');
            } finally {
                restoreFileSettings.value = ''; // Reset file input
            }
        };
        reader.onerror = () => {
            showToast('Eroare Fișier', 'Nu s-a putut citi fișierul selectat.', 'danger');
            restoreFileSettings.value = ''; // Reset file input
        };
        reader.readAsText(file);
    }

     function handleExportData(format) {
        const dataToExport = filterAndSortWorkouts(); // Export filtered/sorted data
        if (dataToExport.length === 0) {
            showToast('Export Anulat', 'Nu există date de antrenament pentru a exporta.', 'warning');
            return;
        }

        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `jurnal_antrenamente_${timestamp}`;

        try {
            if (format === 'csv') {
                exportToCSV(dataToExport, filename + '.csv');
            } else if (format === 'txt') {
                exportToTXT(dataToExport, filename + '.txt');
            } else if (format === 'pdf') {
                exportToPDF(dataToExport, filename + '.pdf');
            }
             showToast('Export Inițiat', `Se generează fișierul ${format.toUpperCase()}...`, 'info');
        } catch(error) {
             console.error(`Export ${format} error:`, error);
             showToast('Eroare Export', `Nu s-a putut genera fișierul ${format.toUpperCase()}.`, 'danger');
        }
    }

     function exportToCSV(data, filename) {
        const headers = ["Data", "Exercitiu", "Grupe", "Seturi", "Rep_Total", "Greutate_Med", "Volum_Kg", "e1RM_Max", "Notite"];
        // Format sets nicely
        const formatSets = (sets) => (sets || []).map(s => `${s.reps}x${s.weight}kg`).join(' | ');
        // Calculate metrics within the map
        const rows = data.map(w => {
            const sets = w.sets || [];
            const totalReps = sets.reduce((sum, set) => sum + (set.reps || 0), 0);
            const validSetsForAvgWeight = sets.filter(set => typeof set.weight === 'number');
            const totalWeightSum = validSetsForAvgWeight.reduce((sum, set) => sum + set.weight, 0);
            const avgWeight = validSetsForAvgWeight.length > 0 ? (totalWeightSum / validSetsForAvgWeight.length) : 0;
            const volume = calculateVolume([w]);
            const maxE1RM = calculateMaxE1RM(sets);
             return [
                formatDate(w.date),
                `"${escapeCSV(w.exercise)}"`, // Escape potential commas in name
                `"${escapeCSV(Array.isArray(w.muscleGroups) ? w.muscleGroups.join(', ') : '')}"`,
                formatSets(sets), // Sets already formatted, no need for quotes usually
                totalReps,
                avgWeight.toFixed(1),
                volume.toFixed(1),
                maxE1RM.toFixed(1),
                `"${escapeCSV(w.notes || '')}"`
             ];
        });

        const csvContent = "data:text/csv;charset=utf-8," +
            headers.join(",") + "\n" +
            rows.map(e => e.join(",")).join("\n");

        downloadFile(csvContent, filename);
    }

     function exportToTXT(data, filename) {
         let txtContent = "Jurnal Antrenamente\n====================\n\n";
         const formatSets = (sets) => (sets || []).map(s => `${s.reps}x${s.weight}kg`).join(' | ');

         data.forEach(w => {
             const sets = w.sets || [];
             const totalReps = sets.reduce((sum, set) => sum + (set.reps || 0), 0);
             const volume = calculateVolume([w]);
             const maxE1RM = calculateMaxE1RM(sets);

             txtContent += `Data: ${formatDate(w.date)}\n`;
             txtContent += `Exercițiu: ${w.exercise}\n`;
             txtContent += `Grupe: ${Array.isArray(w.muscleGroups) ? w.muscleGroups.join(', ') : ''}\n`;
             txtContent += `Seturi: ${formatSets(sets)} (Total Reps: ${totalReps}, Vol: ${volume.toFixed(1)}kg, Max e1RM: ${maxE1RM.toFixed(1)}kg)\n`;
             if (w.notes) {
                 txtContent += `Notițe: ${w.notes}\n`;
             }
             txtContent += `----------\n`;
         });

         const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
         downloadFile(URL.createObjectURL(blob), filename, true); // Revoke needed
     }

    function exportToPDF(data, filename) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Jurnal Antrenamente", 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Data export: ${new Date().toLocaleDateString('ro-RO')}`, 14, 30);

        const tableColumn = ["Data", "Exercitiu", "Grupe", "Seturi Detaliu", "Vol(kg)", "e1RM"];
        const tableRows = [];

        const formatSets = (sets) => (sets || []).map(s => `${s.reps}x${s.weight}kg`).join(', ');

        data.forEach(w => {
            const workoutData = [
                formatDate(w.date),
                w.exercise,
                Array.isArray(w.muscleGroups) ? w.muscleGroups.join(', ') : '',
                formatSets(w.sets),
                calculateVolume([w]).toFixed(1),
                calculateMaxE1RM(w.sets).toFixed(1)
                // Could add notes here but might make table too wide
            ];
            tableRows.push(workoutData);
        });

        // Check if autoTable plugin is loaded
        if (typeof doc.autoTable === 'function') {
             doc.autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: 35,
                theme: 'grid', // 'striped', 'grid', 'plain'
                styles: { fontSize: 8 },
                headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                // Example to make 'Exercitiu' column wider
                columnStyles: {
                  1: { cellWidth: 50 }, // Exercise column
                  2: { cellWidth: 30 }, // Groups column
                  3: { cellWidth: 'auto'}, // Sets column
                }
             });
        } else {
            console.error("jsPDF autoTable plugin is not loaded.");
             showToast('Eroare PDF', 'Plugin-ul jsPDF autoTable nu este încărcat.', 'danger');
            // Fallback to basic text rendering (less pretty)
             let y = 40;
             tableRows.forEach(row => {
                 doc.text(row.join(" | "), 14, y);
                 y += 7;
                 if (y > 280) { doc.addPage(); y = 20; } // Basic page break
             });
        }


        doc.save(filename);
    }


    // --- Utility Functions ---
    function filterAndSortWorkouts() {
        const filterDate = filterDateInput.value;
        const filterEx = filterExerciseInput.value.toLowerCase();
        const filterGroup = filterMuscleGroupSelect.value;
        const searchTerm = tableSearchInput.value.toLowerCase();

        let filtered = allWorkouts.filter(w => {
            const matchDate = !filterDate || w.date === filterDate;
            const matchEx = !filterEx || w.exercise.toLowerCase().includes(filterEx);
            const matchGroup = !filterGroup || (Array.isArray(w.muscleGroups) && w.muscleGroups.includes(filterGroup));
            const matchSearch = !searchTerm ||
                                w.exercise.toLowerCase().includes(searchTerm) ||
                                (w.notes && w.notes.toLowerCase().includes(searchTerm));
            return matchDate && matchEx && matchGroup && matchSearch;
        });

        // Sorting
        const modifier = currentSort.order === 'asc' ? 1 : -1;
        filtered.sort((a, b) => {
            let valA, valB;
            switch (currentSort.column) {
                case 'date':
                    valA = a.date; valB = b.date; break;
                case 'exercise':
                    valA = a.exercise.toLowerCase(); valB = b.exercise.toLowerCase(); break;
                case 'muscleGroups':
                    valA = (Array.isArray(a.muscleGroups) ? a.muscleGroups[0] : '').toLowerCase();
                    valB = (Array.isArray(b.muscleGroups) ? b.muscleGroups[0] : '').toLowerCase();
                    break;
                case 'sets':
                    valA = a.sets ? a.sets.length : 0; valB = b.sets ? b.sets.length : 0; break;
                case 'volume':
                    valA = calculateVolume([a]); valB = calculateVolume([b]); break;
                case 'e1rm':
                    valA = calculateMaxE1RM(a.sets); valB = calculateMaxE1RM(b.sets); break;
                default: return 0;
            }
            if (valA < valB) return -1 * modifier;
            if (valA > valB) return 1 * modifier;
            return 0;
        });

        return filtered;
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            // Assuming dateString is 'YYYY-MM-DD'
            const date = new Date(dateString + 'T00:00:00'); // Add time to avoid timezone issues
            if (isNaN(date.getTime())) return dateString; // Return original if invalid
            return date.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (e) { return dateString; }
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
    }

    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe
             .replace(/&/g, "&")
             .replace(/</g, "<")
             .replace(/>/g, ">")
             .replace(/"/g, """)
             .replace(/'/g, "'");
    }

     function escapeCSV(str) {
        if (typeof str !== 'string') return str;
        // Escape double quotes by doubling them, and wrap field in quotes if it contains comma, newline or double quote
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
            return str.replace(/"/g, '""');
        }
        return str;
    }

    function downloadFile(content, filename, revoke = false) {
         const a = document.createElement('a');
         // Handle both data URI and Object URL cases
         if (content.startsWith('data:') || content.startsWith('blob:')) {
             a.href = content;
         } else {
             // Assuming text content otherwise
             const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
             a.href = URL.createObjectURL(blob);
             revoke = true; // Mark for revoking since we created an Object URL
         }
         a.download = filename;
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         if (revoke && a.href.startsWith('blob:')) {
             URL.revokeObjectURL(a.href);
         }
     }


    // --- Dashboard Rendering (Placeholders - Requires D3 implementation) ---
    function updateDashboard() {
        console.log("Updating dashboard...");
        const period = dashboardPeriodSelect?.value || 'last7days';
        const data = getDashboardData(period); // Calculate data

        // Update Summary Stats
        if (statsExercises) statsExercises.textContent = data.summary.totalEntries;
        if (statsSets) statsSets.textContent = data.summary.totalSets;
        if (statsReps) statsReps.textContent = data.summary.totalReps;
        if (statsAvgWeight) statsAvgWeight.textContent = `${data.summary.averageWeight.toFixed(1)} kg`;
        if (statsTotalVolume) statsTotalVolume.textContent = `${(data.summary.totalVolume / 1000).toFixed(1)} T`; // Tonnes

        // Update Weekly Averages
        if(weeklyAvgWorkouts) weeklyAvgWorkouts.textContent = data.weekly.avgWorkoutsPerWeek.toFixed(1);
        if(weeklyAvgSets) weeklyAvgSets.textContent = data.weekly.avgSetsPerWeek.toFixed(0);
        if(weeklyAvgReps) weeklyAvgReps.textContent = data.weekly.avgRepsPerWeek.toFixed(0);
        if(weeklyAvgRepsPerSet) weeklyAvgRepsPerSet.textContent = data.weekly.avgRepsPerSet.toFixed(1);
        if(weeklyAvgVolume) weeklyAvgVolume.textContent = `${(data.weekly.avgVolumePerWeek / 1000).toFixed(1)} T`;

        // Update PR List
        renderPersonalRecordsList(data.personalRecords);

        // Render Charts
        renderMusclesWorkedChart(data.musclesWorked);
        renderDailyVolumeChart(data.dailyVolume);
        renderProgressChart(progressExerciseSelectDash?.value || ''); // Render based on selection

         // Update placeholder text visibility for charts
        if(noMuscleDataMessage) noMuscleDataMessage.classList.toggle('d-none', data.musclesWorked.length > 0);
        if(noVolumeDataMessage) noVolumeDataMessage.classList.toggle('d-none', data.dailyVolume.length > 0);
        if(noProgressDataMessage) noProgressDataMessage.classList.toggle('d-none', !!progressExerciseSelectDash?.value);

        console.log("Dashboard updated for period:", period);
    }

    function getDashboardData(period) {
        const now = new Date();
        let startDate;

        if (period === 'last7days') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6); // Include today
        } else if (period === 'last30days') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        } else { // allTime
            startDate = new Date(0); // Beginning of time
        }
         startDate.setHours(0, 0, 0, 0); // Start of the day

        const filteredWorkouts = allWorkouts.filter(w => {
            const workoutDate = new Date(w.date + 'T00:00:00'); // Ensure consistent comparison
             return workoutDate >= startDate;
        });

        // Calculate Summary Stats
        const totalEntries = filteredWorkouts.length;
        const totalSets = filteredWorkouts.reduce((sum, w) => sum + (w.sets ? w.sets.length : 0), 0);
        const totalReps = filteredWorkouts.reduce((sum, w) => sum + (w.sets ? w.sets.reduce((rSum, s) => rSum + (s.reps || 0), 0) : 0), 0);
        const totalVolume = calculateVolume(filteredWorkouts);
        let totalWeightForAvg = 0;
        let totalRepsForAvg = 0;
         filteredWorkouts.forEach(w => {
             (w.sets || []).forEach(s => {
                 if(typeof s.weight === 'number' && typeof s.reps === 'number' && s.reps > 0){
                     totalWeightForAvg += s.weight * s.reps;
                     totalRepsForAvg += s.reps;
                 }
             });
         });
        const averageWeight = totalRepsForAvg > 0 ? (totalWeightForAvg / totalRepsForAvg) : 0;


        // Calculate Weekly Averages (Estimate based on period)
        const daysInPeriod = period === 'allTime'
            ? (filteredWorkouts.length > 0 ? (new Date() - new Date(filteredWorkouts[0].date + 'T00:00:00')) / (1000 * 60 * 60 * 24) + 1 : 1)
            : (period === 'last30days' ? 30 : 7);
        const weeksInPeriod = Math.max(1, daysInPeriod / 7);

        const workoutDays = new Set(filteredWorkouts.map(w => w.date)).size;
        const avgWorkoutsPerWeek = workoutDays / weeksInPeriod;
        const avgSetsPerWeek = totalSets / weeksInPeriod;
        const avgRepsPerWeek = totalReps / weeksInPeriod;
        const avgVolumePerWeek = totalVolume / weeksInPeriod;
        const avgRepsPerSet = totalSets > 0 ? totalReps / totalSets : 0;

         // Get Personal Records Data (already stored, just format for display)
         // Sort PRs by exercise name for consistent display
         const prData = Object.entries(personalRecords)
             .map(([exercise, record]) => ({ exercise, ...record }))
             .sort((a, b) => a.exercise.localeCompare(b.exercise));


        // Calculate Muscle Groups Worked (% of Sets)
        const muscleCounts = {};
        let totalValidSetsForMuscle = 0;
         filteredWorkouts.forEach(w => {
            if (Array.isArray(w.muscleGroups) && w.muscleGroups.length > 0) {
                 const setsCount = w.sets ? w.sets.length : 0;
                 if(setsCount > 0){
                     totalValidSetsForMuscle += setsCount;
                     w.muscleGroups.forEach(group => {
                         muscleCounts[group] = (muscleCounts[group] || 0) + setsCount;
                     });
                 }
             }
         });
         // Convert counts to percentages or just use counts for the chart
         const musclesWorked = Object.entries(muscleCounts)
            .map(([name, count]) => ({ name, value: count })) // Use count or calculate percentage: (count / totalValidSetsForMuscle * 100)
            .sort((a, b) => b.value - a.value); // Sort descending by count/percentage


         // Calculate Daily Volume
         const dailyVolumeData = {};
         filteredWorkouts.forEach(w => {
             const date = w.date;
             const volume = calculateVolume([w]);
             dailyVolumeData[date] = (dailyVolumeData[date] || 0) + volume;
         });
         const dailyVolume = Object.entries(dailyVolumeData)
             .map(([date, volume]) => ({ date: new Date(date + 'T00:00:00'), volume }))
             .sort((a, b) => a.date - b.date);


        return {
            summary: { totalEntries, totalSets, totalReps, averageWeight, totalVolume },
            weekly: { avgWorkoutsPerWeek, avgSetsPerWeek, avgRepsPerWeek, avgRepsPerSet, avgVolumePerWeek },
            personalRecords: prData,
            musclesWorked: musclesWorked,
            dailyVolume: dailyVolume
        };
    }

    function renderPersonalRecordsList(prData) {
         if(!personalRecordsList || !noPrMessage) return;
         personalRecordsList.innerHTML = ''; // Clear

        // Sort PRs by e1RM descending and take top 5 for display
        const topPrs = prData.filter(pr => pr.e1rm > 0) // Filter out entries with 0 e1rm
                             .sort((a, b) => b.e1rm - a.e1rm)
                             .slice(0, 5);


         if (topPrs.length === 0) {
             noPrMessage.classList.remove('d-none');
         } else {
             noPrMessage.classList.add('d-none');
             topPrs.forEach(pr => {
                 const li = document.createElement('li');
                 li.classList.add('list-group-item');
                 li.innerHTML = `
                     <span class="pr-exercise">${escapeHtml(pr.exercise)}</span>
                     <div class="pr-details">
                         <span class="pr-value badge text-bg-primary" title="Record e1RM"><i class="bi bi-bullseye"></i> ${pr.e1rm.toFixed(1)} <span class="pr-type">kg</span></span>
                         ${pr.date ? `<span class="pr-date fst-italic">(${formatDate(pr.date)})</span>` : ''}
                         <!-- Optionally display other PR types like max weight lifted -->
                         <!-- <span class="pr-value badge text-bg-info"><i class="bi bi-arrow-up-circle"></i> ${pr.weight?.toFixed(1)} <span class="pr-type">kg Max</span></span> -->
                         <!-- <span class="pr-value badge text-bg-warning"><i class="bi bi-graph-up"></i> ${(pr.volume/1000)?.toFixed(1)} <span class="pr-type">T Vol</span></span> -->
                     </div>
                 `;
                 personalRecordsList.appendChild(li);
             });
         }
     }

    // --- D3 Chart Rendering Functions (Placeholders) ---
    function renderMusclesWorkedChart(data) {
        if (!d3MusclesChartSvg || !d3MusclesChartContainer) return;
        d3.select(d3MusclesChartSvg).selectAll("*").remove(); // Clear previous chart

         if (data.length === 0) {
             // Handled by noMuscleDataMessage visibility in updateDashboard
             return;
         }

        // TODO: Implement D3 Bar Chart logic here
        // Example: Use d3.scaleBand for x-axis (muscle names), d3.scaleLinear for y-axis (count/percentage)
        // Draw bars, axes, and labels.
         const containerWidth = d3MusclesChartContainer.clientWidth;
         const containerHeight = 300; // Match SVG height
         const margin = { top: 20, right: 20, bottom: 70, left: 40 }; // Increased bottom margin for labels
         const width = containerWidth - margin.left - margin.right;
         const height = containerHeight - margin.top - margin.bottom;

         const svg = d3.select(d3MusclesChartSvg)
             .attr("width", containerWidth)
             .attr("height", containerHeight)
             .append("g")
             .attr("transform", `translate(${margin.left},${margin.top})`);

         // Limit data to top 10 for clarity
         const chartData = data.slice(0, 10);

         const x = d3.scaleBand()
             .domain(chartData.map(d => d.name))
             .range([0, width])
             .padding(0.2);

         const y = d3.scaleLinear()
             .domain([0, d3.max(chartData, d => d.value) || 1]) // Ensure domain starts at 0 and has a max
             .nice()
             .range([height, 0]);

         // Draw X axis
         svg.append("g")
             .attr("transform", `translate(0,${height})`)
             .call(d3.axisBottom(x))
             .selectAll("text")
                 .attr("transform", "rotate(-45)")
                 .style("text-anchor", "end")
                 .style("font-size", "9px"); // Smaller font for labels

         // Draw Y axis
         svg.append("g")
             .call(d3.axisLeft(y).ticks(5)); // Limit ticks

        // Draw Bars
         svg.selectAll(".muscle-bar")
             .data(chartData)
             .enter()
             .append("rect")
             .attr("class", "muscle-bar")
             .attr("x", d => x(d.name))
             .attr("y", d => y(d.value))
             .attr("width", x.bandwidth())
             .attr("height", d => height - y(d.value))
              .append("title") // Simple tooltip
              .text(d => `${d.name}: ${d.value} seturi`);

        // Optional: Add labels on bars
        svg.selectAll(".bar-label")
            .data(chartData)
            .enter()
            .append("text")
            .attr("class", "bar-label")
            .attr("x", d => x(d.name) + x.bandwidth() / 2)
            .attr("y", d => y(d.value) - 5) // Position above bar
            .attr("text-anchor", "middle")
            .text(d => d.value);


        console.log("D3: Muscles Worked Chart Rendered (Placeholder)");
    }

    function renderDailyVolumeChart(data) {
        if (!d3VolumeChartDashSvg) return;
         d3.select(d3VolumeChartDashSvg).selectAll("*").remove();

        if (data.length === 0) return;

        // TODO: Implement D3 Line Chart logic here
        // Use d3.scaleTime for x-axis (date), d3.scaleLinear for y-axis (volume)
        // Draw line, area (optional), axes.
         console.log("D3: Daily Volume Chart Rendered (Placeholder)");
         // Example: Draw a simple placeholder text
         d3.select(d3VolumeChartDashSvg)
             .append("text")
             .attr("x", 10)
             .attr("y", 20)
             .attr("fill", "currentColor") // Use CSS variable color
             .text("D3 Daily Volume Chart Placeholder");
    }

    function renderProgressChart(exerciseName) {
        if (!d3ProgressChartDashSvg) return;
        d3.select(d3ProgressChartDashSvg).selectAll("*").remove(); // Clear previous

        if (!exerciseName) {
            if(noProgressDataMessage) noProgressDataMessage.classList.remove('d-none');
             return; // No exercise selected
        }
         if(noProgressDataMessage) noProgressDataMessage.classList.add('d-none');


        // Filter workouts for the selected exercise
        const exerciseWorkouts = allWorkouts
            .filter(w => w.exercise === exerciseName && w.sets && w.sets.length > 0)
            .map(w => ({
                date: new Date(w.date + 'T00:00:00'),
                e1rm: calculateMaxE1RM(w.sets),
                volume: calculateVolume([w])
            }))
            .filter(w => w.e1rm > 0 || w.volume > 0) // Keep only entries with data
            .sort((a, b) => a.date - b.date); // Sort by date

        if (exerciseWorkouts.length === 0) {
             d3.select(d3ProgressChartDashSvg).append("text").attr("x", 10).attr("y", 20).attr("fill", "currentColor").text("Nu există date pentru acest exercițiu.");
            return;
        }

        // TODO: Implement D3 Multi-Line Chart logic here (e1RM and Volume vs. Date)
        // Use d3.scaleTime for x-axis, two d3.scaleLinear for left (e1RM) and right (Volume) y-axes.
        // Draw lines, points, axes, legend.
        console.log("D3: Progress Chart Rendered (Placeholder) for:", exerciseName);
        d3.select(d3ProgressChartDashSvg)
             .append("text")
             .attr("x", 10)
             .attr("y", 20)
             .attr("fill", "currentColor")
             .text(`D3 Progress Chart Placeholder for ${exerciseName}`);

    }


    // --- Start the app ---
    initializeApp();

}); // End DOMContentLoaded
