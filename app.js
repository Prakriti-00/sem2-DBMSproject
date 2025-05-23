const apiBase = 'http://localhost:3000';
const HUNGER_DECREASE_INTERVAL = 1 * 60 * 1000;

let loggedInUserId = null;
let userPets = [];
let hungerDecreaseIntervalId = null;


// Register user
document.getElementById('register-btn').addEventListener('click', async () => {
  const username = document.getElementById('register-username').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const msg = document.getElementById('register-msg');

  if (!username || !email) {
    msg.textContent = 'Username and email are required.';
    return;
  }

  try {
    const res = await fetch(`${apiBase}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email }),
    });
    const data = await res.json();

    if (res.ok) {
      msg.style.color = 'green';
      msg.textContent = `Registered! Your User ID: ${data.userId}`;
      document.getElementById('register-username').value = '';
      document.getElementById('register-email').value = '';
    } else {
      msg.style.color = 'red';
      msg.textContent = data.error || 'Registration failed.';
    }
  } catch (error) {
    msg.textContent = 'Network error.';
  }
});

// Login user
document.getElementById('login-btn').addEventListener('click', async () => {
  const userId = document.getElementById('login-userId').value.trim();
  const email = document.getElementById('login-email').value.trim();
  const msg = document.getElementById('login-msg');

  if (!userId && !email) {
    msg.textContent = 'Please provide User ID or Email.';
    return;
  }

  try {
    const res = await fetch(`${apiBase}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId || undefined, email: email || undefined }),
    });
    const data = await res.json();

    if (res.ok) {
      console.log('Login response:', data);
      msg.style.color = 'green';
      msg.textContent = `Welcome, ${data.username}!`;
      loggedInUserId = data.userId;

      const userDisplay = document.getElementById('user-display');
      userDisplay.innerHTML = `
      <div style="background:white; color:black; padding:4px;">
      Welcome ${data.username || 'undefined'}, User id: ${data.userId || 'undefined'}
      </div>
      `;

  
      userDisplay.classList.remove('hidden');

      document.getElementById('register-section').classList.add('hidden');
      document.getElementById('login-section').classList.add('hidden');
      document.getElementById('logout-btn').classList.remove('hidden');
      document.getElementById('pet-section').classList.remove('hidden');
      document.getElementById('food-section').classList.remove('hidden');
      document.getElementById('activities-section').classList.remove('hidden');

      startHungerDecreaseTimer();

      await loadPetTypes();
      await loadPets();
      await loadFoodOptions();
      await loadActivityOptions();
      await loadFoodLog();
      await loadActivitiesLog();
    } else {
      msg.style.color = 'red';
      msg.textContent = data.error || 'Login failed.';
    }
  } catch (error) {
    msg.textContent = 'Network error.';
  }
});

// Logout user
document.getElementById('logout-btn').addEventListener('click', () => {
  if (hungerDecreaseIntervalId) {
    clearInterval(hungerDecreaseIntervalId);
    hungerDecreaseIntervalId = null;
  }
  loggedInUserId = null;
  userPets = [];

  document.getElementById('user-display').classList.add('hidden');
  document.getElementById('user-display').innerHTML = '';
  
  document.getElementById('register-section').classList.remove('hidden');
  document.getElementById('login-section').classList.remove('hidden');
  document.getElementById('logout-btn').classList.add('hidden');
  document.getElementById('pet-section').classList.add('hidden');
  document.getElementById('food-section').classList.add('hidden');
  document.getElementById('activities-section').classList.add('hidden');
  
  // Clear all forms and messages
  document.querySelectorAll('input').forEach(input => input.value = '');
  document.querySelectorAll('.message').forEach(msg => msg.textContent = '');
  document.querySelectorAll('ul').forEach(ul => ul.innerHTML = '');
  document.querySelectorAll('select').forEach(select => select.innerHTML = '');
});

// Load pet types for dropdown
async function loadPetTypes() {
  const select = document.getElementById('pet-type-id');
  
  try {
    const res = await fetch(`${apiBase}/pet-types`);
    const petTypes = await res.json();

    select.innerHTML = '<option value="">Select Pet Type</option>';
    petTypes.forEach(type => {
      const option = document.createElement('option');
      option.value = type.pet_type_id;
      option.textContent = type.type_name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading pet types:', error);
  }
}

// Add a pet
document.getElementById('add-pet-btn').addEventListener('click', async () => {
  const petName = document.getElementById('pet-name').value.trim();
  const petTypeId = Number(document.getElementById('pet-type-id').value);
  const age = Number(document.getElementById('pet-age').value);
  const msg = document.getElementById('add-pet-msg');

  if (!petName || !petTypeId || isNaN(age)) {
    msg.textContent = 'Please fill all pet details correctly.';
    return;
  }

  try {
    const res = await fetch(`${apiBase}/pets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: loggedInUserId, pet_name: petName, pet_type_id: petTypeId, age }),
    });
    const data = await res.json();

    if (res.ok) {
      msg.style.color = 'green';
      msg.textContent = 'Pet added successfully!';
      document.getElementById('pet-name').value = '';
      document.getElementById('pet-type-id').value = '';
      document.getElementById('pet-age').value = '';
      loadPets();
    } else {
      msg.style.color = 'red';
      msg.textContent = data.error || 'Failed to add pet.';
    }
  } catch (error) {
    msg.textContent = 'Network error.';
  }
});

// Load pets of logged-in user
async function loadPets() {
  const list = document.getElementById('pets-list');
  list.innerHTML = 'Loading...';

  try {
    const res = await fetch(`${apiBase}/users/${loggedInUserId}/pets`);
    const pets = await res.json();
    userPets = pets;

    if (!Array.isArray(pets) || pets.length === 0) {
      list.innerHTML = '<li>No pets found.</li>';
      return;
    }

    list.innerHTML = '';
    pets.forEach(pet => {
      const li = document.createElement('li');
      li.className = 'pet-item';
      li.innerHTML = `
        <div class="pet-header">
          <strong>${pet.pet_name}</strong> (${pet.type_name}, Age: ${pet.age})
        </div>
        <div class="pet-stats">
          <div class="stat-bar">
            <label>Happiness: ${pet.happiness_level || 0}%</label>
            <div class="progress-bar">
              <div class="progress-fill happiness" style="width: ${pet.happiness_level || 0}%"></div>
            </div>
          </div>
          <div class="stat-bar">
            <label>Hunger: ${pet.hunger_level || 0}%</label>
            <div class="progress-bar">
              <div class="progress-fill hunger" style="width: ${pet.hunger_level || 0}%"></div>
            </div>
          </div>
        </div>
        <div class="pet-actions">
          
          <button onclick="showAdvancedOptions(${pet.pet_id})" class="advanced-btn">Feed/Play!</button>
          <button onclick="showStatus(${pet.pet_id})" class="status-btn">Status</button>
          <button onclick="deletePet(${pet.pet_id})" class="delete-btn">Delete</button>
        </div>
        <div id="advanced-${pet.pet_id}" class="advanced-options hidden">
          <div class="feeding-section">
            <h4>Feed with specific food:</h4>
            <select id="food-select-${pet.pet_id}"></select>
            <button onclick="feedPetWithSpecificFood(${pet.pet_id})">Feed</button>
          </div>
          <div class="activity-section">
            <h4>Play specific activity:</h4>
            <select id="activity-select-${pet.pet_id}"></select>
            <button onclick="playWithSpecificActivity(${pet.pet_id})">Play</button>
          </div>
        </div>
        <div id="status-${pet.pet_id}" class="pet-status"></div>
      `;
      list.appendChild(li);
    });

    // Populate food and activity selects for each pet
    pets.forEach(pet => {
      populateFoodSelect(pet.pet_id);
      populateActivitySelect(pet.pet_id);
    });

  } catch (error) {
    list.innerHTML = '<li>Error loading pets.</li>';
  }
}


// Show advanced options for a pet
function showAdvancedOptions(petId) {
  const advancedDiv = document.getElementById(`advanced-${petId}`);
  advancedDiv.classList.toggle('hidden');
}

// Feed pet with specific food
async function feedPetWithSpecificFood(petId) {
  const foodSelect = document.getElementById(`food-select-${petId}`);
  const foodId = foodSelect.value;

  if (!foodId) {
    showNotification('Please select a food first.', 'error');
    return;
  }

  try {
    const res = await fetch(`${apiBase}/pets/${petId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ food_id: parseInt(foodId) }),
    });
    const data = await res.json();

    showNotification(data.message || 'Fed the pet with selected food!', 'success');
    loadPets();
    loadFoodLog();
  } catch (error) {
    showNotification('Error feeding pet with food.', 'error');
  }
}

// Play with specific activity
async function playWithSpecificActivity(petId) {
  const activitySelect = document.getElementById(`activity-select-${petId}`);
  const activityId = activitySelect.value;

  if (!activityId) {
    showNotification('Please select an activity first.', 'error');
    return;
  }

  try {
    const res = await fetch(`${apiBase}/pets/${petId}/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity_id: parseInt(activityId) }),
    });
    const data = await res.json();

    showNotification(data.message || 'Played with the pet!', 'success');
    loadPets();
    loadActivitiesLog();
  } catch (error) {
    showNotification('Error playing with pet.', 'error');
  }
}

// Populate food select for a specific pet
async function populateFoodSelect(petId) {
  const select = document.getElementById(`food-select-${petId}`);
  
  try {
    const res = await fetch(`${apiBase}/foods`);
    const foods = await res.json();

    select.innerHTML = '<option value="">Choose food</option>';
    foods.forEach(food => {
      const option = document.createElement('option');
      option.value = food.food_id;
      option.textContent = `${food.food_name} (+${food.nutrition_value} hunger)`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading foods:', error);
  }
}

// Populate activity select for a specific pet
async function populateActivitySelect(petId) {
  const select = document.getElementById(`activity-select-${petId}`);
  
  try {
    const res = await fetch(`${apiBase}/activities`);
    const activities = await res.json();

    select.innerHTML = '<option value="">Choose activity</option>';
    activities.forEach(activity => {
      const option = document.createElement('option');
      option.value = activity.activity_id;
      option.textContent = `${activity.activity_name} (+${activity.happiness_boost} happiness)`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading activities:', error);
  }
}

// Modify the timer function
function startHungerDecreaseTimer() {
  if (hungerDecreaseIntervalId) clearInterval(hungerDecreaseIntervalId);

  hungerDecreaseIntervalId = setInterval(async () => {
    if (loggedInUserId) {
      try {
        // Send the loggedInUserId to backend
        const res = await fetch(`${apiBase}/pets/decrease-hunger`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: loggedInUserId }) // <- Critical change
        });
        
        const data = await res.json();
        
        if (res.ok && data.updatedPet) {
          console.log(data.message);
          
          // Update the specific pet in the UI
          const index = userPets.findIndex(p => p.pet_id === data.updatedPet.pet_id);
          if (index !== -1) {
            userPets[index] = data.updatedPet;
            renderPets(); // Refresh the display
          }
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }
  }, HUNGER_DECREASE_INTERVAL);
}

// Delete pet
async function deletePet(petId) {
  if (!confirm('Are you sure you want to delete this pet? This action cannot be undone.')) {
    return;
  }

  try {
    const res = await fetch(`${apiBase}/pets/${petId}`, { method: 'DELETE' });
    const data = await res.json();

    if (res.ok) {
      showNotification('Pet deleted successfully.', 'success');
      loadPets();
      loadFoodLog();
      loadActivitiesLog();
    } else {
      showNotification(data.error || 'Failed to delete pet.', 'error');
    }
  } catch (error) {
    showNotification('Error deleting pet.', 'error');
  }
}

// Show pet status
async function showStatus(petId) {
  const statusDiv = document.getElementById(`status-${petId}`);

  try {
    const res = await fetch(`${apiBase}/pets/${petId}/status`);
    const status = await res.json();

    if (res.ok) {
      statusDiv.classList.remove('hidden');
      statusDiv.innerHTML = `
        <div class="status-details">
          <h4>Pet Status</h4>
          <p><strong>Name:</strong> ${status.pet_name}</p>
          <p><strong>Type:</strong> ${status.pet_type}</p>
          <p><strong>Age:</strong> ${status.age}</p>
          <p><strong>Happiness:</strong> ${status.happiness_level}%</p>
          <p><strong>Hunger:</strong> ${status.hunger_level}%</p>
          <button onclick="hideStatus(${petId})">Hide Status</button>
        </div>
      `;
    } else {
      statusDiv.textContent = status.error || 'Failed to get status';
    }
  } catch (error) {
    statusDiv.textContent = 'Network error.';
  }
}

// Hide pet status
function hideStatus(petId) {
  const statusDiv = document.getElementById(`status-${petId}`);
  statusDiv.classList.add('hidden');
  statusDiv.innerHTML = '';
}

// Load food options to display
async function loadFoodOptions() {
  const list = document.getElementById('food-options-list');
  list.innerHTML = 'Loading...';

  try {
    const res = await fetch(`${apiBase}/foods`);
    const foods = await res.json();

    if (!Array.isArray(foods) || foods.length === 0) {
      list.innerHTML = '<li>No food options available.</li>';
      return;
    }

    list.innerHTML = '';
    foods.forEach(food => {
      const li = document.createElement('li');
      li.className = 'food-item';
      li.innerHTML = `
        <div class="food-info">
          <strong>${food.food_name}</strong>
          <span class="nutrition">Nutrition: +${food.nutrition_value}</span>
        </div>
      `;
      list.appendChild(li);
    });
  } catch (error) {
    list.innerHTML = '<li>Error loading food options.</li>';
  }
}

// Load activity options to display
async function loadActivityOptions() {
  const list = document.getElementById('activity-options-list');
  list.innerHTML = 'Loading...';

  try {
    const res = await fetch(`${apiBase}/activities`);
    const activities = await res.json();

    if (!Array.isArray(activities) || activities.length === 0) {
      list.innerHTML = '<li>No activity options available.</li>';
      return;
    }

    list.innerHTML = '';
    activities.forEach(activity => {
      const li = document.createElement('li');
      li.className = 'activity-item';
      li.innerHTML = `
        <div class="activity-info">
          <strong>${activity.activity_name}</strong>
          <span class="happiness">Happiness: +${activity.happiness_boost}</span>
        </div>
      `;
      list.appendChild(li);
    });
  } catch (error) {
    list.innerHTML = '<li>Error loading activity options.</li>';
  }
}

// Load food log for the user
async function loadFoodLog() {
  const list = document.getElementById('food-log-list');
  list.innerHTML = 'Loading...';

  try {
    const res = await fetch(`${apiBase}/users/${loggedInUserId}/food-log`);
    const logs = await res.json();

    if (!Array.isArray(logs) || logs.length === 0) {
      list.innerHTML = '<li>No food logs found.</li>';
      return;
    }

    list.innerHTML = '';
    logs.slice(0, 10).forEach(log => { // Show only recent 10 entries
      const li = document.createElement('li');
      li.className = 'log-item';
      li.innerHTML = `
        <div class="log-info">
          <strong>${log.pet_name}</strong> ate <strong>${log.food_name}</strong>
          <div class="log-time">${new Date(log.timestamp).toLocaleString()}</div>
        </div>
      `;
      list.appendChild(li);
    });
  } catch (error) {
    list.innerHTML = '<li>Error loading food logs.</li>';
  }
}

// Load activities log for the user
async function loadActivitiesLog() {
  const list = document.getElementById('activities-log-list');
  list.innerHTML = 'Loading...';

  try {
    const res = await fetch(`${apiBase}/users/${loggedInUserId}/activities-log`);
    const logs = await res.json();

    if (!Array.isArray(logs) || logs.length === 0) {
      list.innerHTML = '<li>No activity logs found.</li>';
      return;
    }

    list.innerHTML = '';
    logs.slice(0, 10).forEach(log => { // Show only recent 10 entries
      const li = document.createElement('li');
      li.className = 'log-item';
      li.innerHTML = `
        <div class="log-info">
          <strong>${log.pet_name}</strong> did <strong>${log.activity_name}</strong>
          <div class="log-time">${new Date(log.timestamp).toLocaleString()}</div>
        </div>
      `;
      list.appendChild(li);
    });
  } catch (error) {
    list.innerHTML = '<li>Error loading activity logs.</li>';
  }
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}
