console.log('script.js loaded');

document.addEventListener('DOMContentLoaded', () => {

  let readyStatus = document.querySelector('#readyStatus');
  let notReadyStatus = document.querySelector('#notReadyStatus');
  let myForm = document.querySelector('#myForm');
  let contentArea = document.querySelector('#contentArea');
  let formPopover = document.querySelector('#formPopover');
  let createButton = document.querySelector('#createButton');
  let formHeading = document.querySelector('.form-header h2');

  let filterType = document.querySelector('#filterType');
  let filterMood = document.querySelector('#filterMood');
  let clearFiltersBtn = document.querySelector('#clearFilters');

  let summaryCount = document.querySelector('#summaryCount');
  let summaryDuration = document.querySelector('#summaryDuration');
  let summaryMood = document.querySelector('#summaryMood');
  let cancelButton = myForm.querySelector('.cancel');

 
  const exerciseSearchInput = document.querySelector('#exerciseSearchInput');
  const exerciseSearchBtn = document.querySelector('#exerciseSearchBtn');
  const exerciseSearchStatus = document.querySelector('#exerciseSearchStatus');
  const exerciseResultsList = document.querySelector('#exerciseResultsList');
  const exerciseDetails = document.querySelector('#exerciseDetails');

  let workouts = [];


const EXERCISE_API_URL = 'https://exercises-by-api-ninjas.p.rapidapi.com/v1/exercises';

const exerciseApiHeaders = {
  'X-RapidAPI-Key': '3ecae8dfcbmsh149070b9633d4f1p1b7a24jsn5c589766ba8a',
  'X-RapidAPI-Host': 'exercises-by-api-ninjas.p.rapidapi.com'
};


  const getFormData = () => {
    const formData = new FormData(myForm);
    const json = Object.fromEntries(formData);

    myForm.querySelectorAll('input').forEach(el => {
      const value = json[el.name];
      const isEmpty = value === undefined || value === null || value.toString().trim() === '';

      if (el.type === 'checkbox') {
        json[el.name] = el.checked;
      } else if (el.type === 'number' || el.type === 'range') {
        json[el.name] = isEmpty ? null : Number(value);
      } else if (el.type === 'date') {
        json[el.name] = isEmpty ? null : new Date(value).toISOString();
      }
    });

    return json;
  };

  myForm.addEventListener('submit', async event => {
    event.preventDefault();
    const data = getFormData();
    await saveItem(data);
    myForm.reset();
    formHeading.textContent = 'Log a Workout';

    if (formPopover && typeof formPopover.hidePopover === 'function') {
      formPopover.hidePopover();
    }
  });


  const saveItem = async (data) => {
    const endpoint = data.id ? `/data/${data.id}` : '/data';
    const method = data.id ? 'PUT' : 'POST';

    const options = {
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };

    try {
      const response = await fetch(endpoint, options);

      if (!response.ok) {
        try {
          const errorData = await response.json();
          console.error('Error:', errorData);
          alert(errorData.error || response.statusText);
        } catch (err) {
          console.error(response.statusText);
          alert('Failed to save: ' + response.statusText);
        }
        return;
      }

      const result = await response.json();
      console.log('Saved:', result);

      // Refresh the data list
      getData();
    } catch (err) {
      console.error('Save error:', err);
      alert('An error occurred while saving');
    }
  };

  // Edit item - populate form with existing data
  const editItem = (data) => {
    console.log('Editing:', data);

    Object.keys(data).forEach(field => {
      const element = myForm.elements[field];
      if (!element) return;

      if (element.type === 'checkbox') {
        element.checked = !!data[field];
      } else if (element.type === 'date') {
        element.value = data[field] ? data[field].substring(0, 10) : '';
      } else {
        element.value = data[field] ?? '';
      }
    });

    formHeading.textContent = 'Edit Workout';
    formPopover.showPopover();
  };

  // Delete item
  const deleteItem = async (id) => {
    if (!confirm('Confirm workout deletion?')) {
      return;
    }

    const endpoint = `/data/${id}`;
    const options = { method: 'DELETE' };

    try {
      const response = await fetch(endpoint, options);

      if (response.ok) {
        const result = await response.json();
        console.log('Deleted:', result);
        getData();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to delete item');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('An error occurred while deleting');
    }
  };

  // Date pill helper
  const datePill = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const month = d.toLocaleString('en-CA', { month: 'short' });
    const day = d.toLocaleString('en-CA', { day: '2-digit' });
    const year = d.toLocaleString('en-CA', { year: 'numeric' });

    return `
      <div class="date-pill">
        <span class="date-day">${day}</span>
        <span class="date-month">${month}</span>
        <span class="date-year">${year}</span>
      </div>
    `;
  };

  // Mood delta text
  const getMoodDeltaText = (before, after) => {
    if (before == null || after == null) return null;
    const delta = after - before;

    if (delta > 0) return { text: `Mood improved by +${delta}`, type: 'positive' };
    if (delta < 0) return { text: `Mood decreased by ${delta}`, type: 'negative' };
    return { text: 'Mood stayed the same', type: 'neutral' };
  };

  // Render a single workout card
  const renderItem = (item) => {
    const div = document.createElement('div');
    div.classList.add('item-card');
    div.setAttribute('data-id', item.id);

    const durationText = item.minuteDuration != null
      ? `${item.minuteDuration} min`
      : '–';

    let setsRepsText = '–';
    if (item.sets && item.reps) {
      setsRepsText = `${item.sets} × ${item.reps}`;
    } else if (item.sets || item.reps) {
      const s = item.sets ? `${item.sets} sets` : '';
      const r = item.reps ? `${item.reps} reps` : '';
      setsRepsText = [s, r].filter(Boolean).join(' ');
    }

    const moodBefore = item.moodBefore ?? null;
    const moodAfter = item.moodAfter ?? null;
    const moodDelta = getMoodDeltaText(moodBefore, moodAfter);

    const workoutName = item.workoutName || 'Untitled workout';
    const workoutType = item.workoutType || 'Uncategorized';

    const notes = item.notes ? item.notes : '';

    const template = /*html*/`
      <div class="item-main">
        <div class="item-header">
          <h3>${DOMPurify.sanitize(workoutName)}</h3>
          <span class="workout-type-pill">${DOMPurify.sanitize(workoutType)}</span>
        </div>
        <p class="item-subline">
          Duration · ${durationText}
          ${setsRepsText !== '–' ? ` · Sets × Reps · ${setsRepsText}` : ''}
        </p>
        <div class="item-stats-row">
          <div class="chip">
            <span class="chip-label">Mood</span>
            <span class="chip-value">
              ${moodBefore != null ? moodBefore : '–'}
              →
              ${moodAfter != null ? moodAfter : '–'}
            </span>
          </div>
          <div class="chip">
            <span class="chip-label">Intensity</span>
            <span class="chip-value">${setsRepsText}</span>
          </div>
          ${moodDelta
            ? `<div class="chip mood-delta">
                  <span class="chip-value">${DOMPurify.sanitize(moodDelta.text)}</span>
               </div>`
            : ''}
        </div>
      </div>

      <div class="item-meta">
        ${datePill(item.date)}
      </div>

      <div class="item-notes" ${notes ? '' : 'style="display:none;"'}>
        <h4>Notes</h4>
        <p>${DOMPurify.sanitize(notes)}</p>
        <div class="item-actions">
          <button class="edit-btn">Edit</button>
          <button class="delete-btn">Delete</button>
        </div>
      </div>

      <div class="item-actions" ${notes ? 'style="display:none;"' : ''}>
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>
      </div>
    `;

    div.innerHTML = template;

    div.querySelectorAll('.edit-btn').forEach(btn =>
      btn.addEventListener('click', () => editItem(item))
    );
    div.querySelectorAll('.delete-btn').forEach(btn =>
      btn.addEventListener('click', () => deleteItem(item.id))
    );

    return div;
  };

  // Apply filters and render visible workouts
  const applyFiltersAndRender = () => {
    let filtered = [...workouts];

    const typeValue = filterType?.value || 'all';
    const moodValue = filterMood?.value || 'all';

    if (typeValue !== 'all') {
      filtered = filtered.filter(w => (w.workoutType || '') === typeValue);
    }

    if (moodValue !== 'all') {
      filtered = filtered.filter(w => {
        const d = getMoodDeltaText(w.moodBefore ?? null, w.moodAfter ?? null);
        if (!d) return false;
        if (moodValue === 'positive') return d.type === 'positive';
        if (moodValue === 'neutral') return d.type === 'neutral';
        if (moodValue === 'negative') return d.type === 'negative';
        return true;
      });
    }

    // Render
    if (filtered.length === 0) {
      contentArea.innerHTML = '<p><i>No workouts match the current filters.</i></p>';
    } else {
      contentArea.innerHTML = '';
      filtered.forEach(item => {
        const itemDiv = renderItem(item);
        contentArea.appendChild(itemDiv);
      });
    }

    updateSummary(filtered);
  };

  // Update summary panel
  const updateSummary = (list) => {
    const count = list.length;
    summaryCount.textContent = count || '–';

    if (!count) {
      summaryDuration.textContent = '–';
      summaryMood.textContent = '–';
      return;
    }

    const totalDuration = list.reduce((sum, w) =>
      sum + (w.minuteDuration || 0), 0
    );
    const avgDuration = totalDuration / count;
    summaryDuration.textContent = `${Math.round(avgDuration)} min`;

    const deltas = list
      .map(w => {
        if (w.moodBefore == null || w.moodAfter == null) return null;
        return w.moodAfter - w.moodBefore;
      })
      .filter(d => d !== null);

    if (deltas.length === 0) {
      summaryMood.textContent = '–';
    } else {
      const totalDelta = deltas.reduce((sum, d) => sum + d, 0);
      const avgDelta = totalDelta / deltas.length;
      const sign = avgDelta > 0 ? '+' : '';
      summaryMood.textContent = `${sign}${avgDelta.toFixed(1)}`;
    }
  };

  // Fetch workouts from API and populate content
  const getData = async () => {
    try {
      const response = await fetch('/data');

      if (response.ok) {
        readyStatus.style.display = 'block';
        notReadyStatus.style.display = 'none';

        const data = await response.json();
        console.log('Fetched data:', data);

        if (!Array.isArray(data) || data.length === 0) {
          workouts = [];
          contentArea.innerHTML = '<p><i>No workouts recorded yet.</i></p>';
          updateSummary([]);
          return;
        }

        // Sort newest first if backend doesn't already
        workouts = data.slice().sort((a, b) => {
          if (!a.date || !b.date) return 0;
          return new Date(b.date) - new Date(a.date);
        });

        applyFiltersAndRender();
      } else {
        notReadyStatus.style.display = 'block';
        readyStatus.style.display = 'none';
        createButton.style.display = 'none';
        contentArea.style.display = 'none';
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      notReadyStatus.style.display = 'block';
    }
  };

  // === Exercise Explorer Helpers ===

  const renderExerciseDetails = (exercise) => {
    if (!exerciseDetails) return;

    const name = exercise.name || 'Unknown exercise';
    const type = exercise.type || '–';
    const muscle = exercise.muscle || '–';
    const difficulty = exercise.difficulty || '–';

    let instructionsHtml = '<li>No instructions available.</li>';

    if (typeof exercise.instructions === 'string' && exercise.instructions.trim() !== '') {
      const parts = exercise.instructions
        .split('.')
        .map(p => p.trim())
        .filter(Boolean);
      if (parts.length > 0) {
        instructionsHtml = parts
          .map(step => DOMPurify.sanitize(step))
          .map(step => `<li>${step}.</li>`)
          .join('');
      }
    } else if (Array.isArray(exercise.instructions) && exercise.instructions.length > 0) {
      instructionsHtml = exercise.instructions
        .map(step => DOMPurify.sanitize(step))
        .map(step => `<li>${step}</li>`)
        .join('');
    }

    exerciseDetails.innerHTML = `
      <h4>${DOMPurify.sanitize(name)}</h4>
      <p class="exercise-meta-line">
        <strong>Type:</strong> ${DOMPurify.sanitize(type.toString())}
      </p>
      <p class="exercise-meta-line">
        <strong>Primary Muscle:</strong> ${DOMPurify.sanitize(muscle.toString())}
      </p>
      <p class="exercise-meta-line">
        <strong>Difficulty:</strong> ${DOMPurify.sanitize(difficulty.toString())}
      </p>
      <h5>Instructions</h5>
      <ol>
        ${instructionsHtml}
      </ol>
    `;
  };

  const renderExerciseResults = (results) => {
    if (!exerciseResultsList) return;

    exerciseResultsList.innerHTML = '';

    if (!Array.isArray(results) || results.length === 0) {
      if (exerciseSearchStatus) {
        exerciseSearchStatus.textContent = 'No exercises found for that search.';
      }
      return;
    }

    const limited = results.slice(0, 10); // cap to 10 so list stays tidy

    limited.forEach((ex) => {
      const li = document.createElement('li');

      const name = ex.name || 'Unknown exercise';
      const type = ex.type || '';
      const muscle = ex.muscle || '';

      li.innerHTML = `
        <span>${DOMPurify.sanitize(name)}</span>
        <span class="tag-pill">
          ${DOMPurify.sanitize([type, muscle].filter(Boolean).join(' · '))}
        </span>
      `;

      li.addEventListener('click', () => {
        renderExerciseDetails(ex);

        const workoutNameField = document.querySelector('#workoutName');
        if (workoutNameField) {
          workoutNameField.value = ex.name || '';
        }
      });

      exerciseResultsList.appendChild(li);
    });

    if (exerciseSearchStatus) {
      exerciseSearchStatus.textContent = `Found ${limited.length} exercise(s). Select one to view details.`;
    }
  };

  const searchExercises = async (query) => {
  const trimmed = query.trim();
  if (!trimmed) {
    if (exerciseSearchStatus) {
      exerciseSearchStatus.textContent = 'Type an exercise name first.';
    }
    return;
  }

  if (exerciseSearchStatus) {
    exerciseSearchStatus.textContent = 'Searching...';
  }
  if (exerciseResultsList) {
    exerciseResultsList.innerHTML = '';
  }
  if (exerciseDetails) {
    exerciseDetails.innerHTML = '<p class="exercise-placeholder">Loading exercise details...</p>';
  }

  try {
    const params = new URLSearchParams({
      name: trimmed.toLowerCase(), 
      offset: '0'
    });

    const url = `${EXERCISE_API_URL}?${params.toString()}`;
    console.log('Exercise API request:', url);

    const res = await fetch(url, {
      method: 'GET',
      headers: exerciseApiHeaders
    });

    if (!res.ok) {
      let body = '';
      try {
        body = await res.text();
      } catch (_) {}

      console.error('Exercise API error', res.status, res.statusText, body);

      let msg = `Error fetching exercises (status ${res.status}).`;
      if (res.status === 400) {
        msg = 'Bad request: the API did not like one of the parameters. Check console for details.';
      } else if (res.status === 429) {
        msg = 'Rate limit reached on RapidAPI. Try again later or check your quota.';
      } else if (res.status === 401 || res.status === 403) {
        msg = 'Unauthorized/forbidden: check your RapidAPI key and host.';
      }

      if (exerciseSearchStatus) {
        exerciseSearchStatus.textContent = msg;
      }
      if (exerciseDetails) {
        exerciseDetails.innerHTML = '<p class="exercise-placeholder">Could not load exercises.</p>';
      }
      return;
    }

    const data = await res.json();
    renderExerciseResults(data);
  } catch (err) {
    console.error('Exercise search error', err);
    if (exerciseSearchStatus) {
      exerciseSearchStatus.textContent =
        'An error occurred while searching exercises (network error).';
    }
    if (exerciseDetails) {
      exerciseDetails.innerHTML = '<p class="exercise-placeholder">Could not load exercises.</p>';
    }
  }
};


  myForm.addEventListener('reset', () => {
    formHeading.textContent = 'Log a Workout';
  });

  createButton.addEventListener('click', () => {
    console.log('Create button clicked');
    myForm.reset();
    formHeading.textContent = 'Log a Workout';

  });

  if (cancelButton) {
    cancelButton.addEventListener('click', () => {
      console.log('Cancel clicked');
      if (formPopover && typeof formPopover.hidePopover === 'function') {
        formPopover.hidePopover();
      }
    });
  }

  if (filterType) {
    filterType.addEventListener('change', applyFiltersAndRender);
  }
  if (filterMood) {
    filterMood.addEventListener('change', applyFiltersAndRender);
  }
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      if (filterType) filterType.value = 'all';
      if (filterMood) filterMood.value = 'all';
      applyFiltersAndRender();
    });
  }

  if (exerciseSearchBtn && exerciseSearchInput) {
    exerciseSearchBtn.addEventListener('click', () => {
      const q = exerciseSearchInput.value.trim();
      if (!q) return;
      searchExercises(q);
    });

    exerciseSearchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const q = exerciseSearchInput.value.trim();
        if (!q) return;
        searchExercises(q);
      }
    });
  }

  getData();
});
