let medicines = [];
let currentDate = new Date();

// Calendar Functions
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    
    document.getElementById('currentMonth').textContent =
        new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate);
    
    const calendarDates = document.getElementById('calendarDates');
    calendarDates.innerHTML = '';
    
    // Add empty cells
    for (let i = 0; i < firstDay.getDay(); i++) {
        calendarDates.appendChild(createDateElement(''));
    }
    
    // Add dates
    for (let date = 1; date <= lastDay.getDate(); date++) {
        const dateCell = createDateElement(date);
        const fullDate = new Date(year, month, date);
        
        const hasMedicine = medicines.some(med => {
            const start = new Date(med.startDate);
            const end   = calculateEndDate(med.startDate, med.durationValue, med.durationType);
            return fullDate >= start && fullDate <= end;
        });
        if (hasMedicine) dateCell.classList.add('has-medicine');
        
        const isCompleted = medicines.every(med => {
            const start = new Date(med.startDate);
            const end   = calculateEndDate(med.startDate, med.durationValue, med.durationType);
            return fullDate >= start && fullDate <= end ? med.taken : true;
        });
        if (isCompleted && hasMedicine) dateCell.classList.add('completed');
        
        calendarDates.appendChild(dateCell);
    }
}

function createDateElement(date) {
    const div = document.createElement('div');
    div.className = 'calendar-date';
    div.textContent = date;
    return div;
}

function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
}

function calculateEndDate(startDate, duration, type) {
    const end = new Date(startDate);
    if (type === 'days') {
        end.setDate(end.getDate() + parseInt(duration));
    } else if (type === 'months') {
        end.setMonth(end.getMonth() + parseInt(duration));
    }
    return end;
}

// UI Functions
function showAddMedicineForm() {
    document.getElementById('addMedicineModal').classList.remove('hidden');
    document.getElementById('startDate').valueAsDate = new Date();
}

function hideAddMedicineForm() {
    document.getElementById('addMedicineModal').classList.add('hidden');
}

function showMarkAsTakenModal(medicineId) {
    const medicine = medicines.find(med => med.id === medicineId);
    if (!medicine) return;
    
    const modal = document.getElementById('markAsTakenModal');
    const content = document.getElementById('markAsTakenContent');
    
    content.innerHTML = `
        <p>Mark "${medicine.name}" as taken?</p>
        <p>Dosage: ${medicine.dosage}</p>
    `;
    
    modal.dataset.medicineId = medicineId;
    modal.classList.remove('hidden');
}

function hideMarkAsTakenModal() {
    document.getElementById('markAsTakenModal').classList.add('hidden');
}

function confirmMedicineTaken() {
    const modal = document.getElementById('markAsTakenModal');
    const medicineId = parseInt(modal.dataset.medicineId, 10);
    const medicine = medicines.find(med => med.id === medicineId);
    if (medicine) {
        medicine.taken = true;
        medicine.lastTaken = new Date().toISOString();
    }
    hideMarkAsTakenModal();
    renderMedicines();
    renderCalendar();
    updateUpcomingMeds();
}

function switchTab(tabName, element) {
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    element.classList.add('active');
    document.getElementById('overviewTab').classList.toggle('hidden', tabName !== 'overview');
    document.getElementById('calendarTab').classList.toggle('hidden', tabName !== 'calendar');
    if (tabName === 'calendar') renderCalendar();
}

// --- Dynamic time & day slots injection ---
const freqSelect = document.getElementById('frequency');
const timeSlots  = document.getElementById('timeSlots');

freqSelect.addEventListener('change', () => {
    timeSlots.innerHTML = '';
    let count = 0;
    switch (freqSelect.value) {
        case 'daily':   count = 1; break;
        case 'twice':   count = 2; break;
        case 'thrice':  count = 3; break;
        case 'weekly':  count = 1; break;
    }
    // Weekly: day-of-week selector
    if (freqSelect.value === 'weekly') {
        const daySelect = document.createElement('select');
        daySelect.name = 'weekDay';
        daySelect.className = 'time-slot';
        daySelect.required = true;
        daySelect.innerHTML = `
            <option value="">Select day</option>
            <option>Sunday</option><option>Monday</option>
            <option>Tuesday</option><option>Wednesday</option>
            <option>Thursday</option><option>Friday</option>
            <option>Saturday</option>
        `;
        timeSlots.appendChild(daySelect);
    }
    // Inject time inputs
    for (let i = 1; i <= count; i++) {
        const input = document.createElement('input');
        input.type = 'time';
        input.className = 'time-slot';
        input.name = freqSelect.value === 'weekly' ? 'timeWeekly' : `time${i}`;
        input.required = true;
        timeSlots.appendChild(input);
    }
});
// --- end injection logic ---

// Handle Add Medicine (via Django endpoint)
async function handleAddMedicine(event) {
    event.preventDefault();
    const name = document.getElementById('medicineName').value;
    const dosage = document.getElementById('dosage').value;
    const frequency = document.getElementById('frequency').value;
    const durationValue = document.getElementById('durationValue').value;
    const durationType = document.getElementById('durationType').value;
    const startDate = document.getElementById('startDate').value;
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    const response = await fetch('/add_medicine/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({
            name,
            dosage,
            frequency,
            duration_value: durationValue,
            duration_type: durationType,
            start_date: startDate
        })
    });

    if (response.ok) {
        await renderMedicines();
        renderCalendar();
        updateUpcomingMeds();
        hideAddMedicineForm();
        event.target.reset();
    } else {
        console.error('Failed to add medicine');
    }
}

async function fetchMedicines() {
    try {
        const response = await fetch('/get_medicines/');
        const data = await response.json();
        medicines = data.medicines;
    } catch (error) {
        console.error('Error fetching medicines:', error);
    }
}

async function renderMedicines() {
    await fetchMedicines();
    const medicineList = document.getElementById('medicineList');
    medicineList.innerHTML = medicines.map(med => `
        <div class="medicine-card">
            <div class="medicine-header" onclick="toggleDetails(this)">
                <h3>${med.name}</h3>
                <span class="expand-icon">▼</span>
            </div>
            <div class="medicine-details" style="display: none;">
                <p><strong>Dosage:</strong> ${med.dosage}</p>
                <p><strong>Frequency:</strong> ${med.frequency}</p>
                <p><strong>Duration:</strong> ${med.durationValue} ${med.durationType}</p>
                <p><strong>Start Date:</strong> ${new Date(med.startDate).toLocaleDateString()}</p>
                <p><strong>Status:</strong> ${med.taken ? 'Taken' : 'Pending'}</p>
                <div class="button-group">
                    ${!med.taken ? `<button onclick="showMarkAsTakenModal(${med.id})" class="success-btn">Mark as Taken</button>` : ''}
                    <button onclick="editMedicine(${med.id})" class="edit-btn">Edit</button>
                    <button onclick="deleteMedicine(${med.id})" class="delete-btn">Delete</button>
                </div>
            </div>
        </div>
    `).join('');
}

function toggleDetails(headerEl) {
    const details = headerEl.nextElementSibling;
    const icon    = headerEl.querySelector('.expand-icon');
    if (details.style.display === 'none') {
        details.style.display = 'block';
        icon.textContent = '▲';
    } else {
        details.style.display = 'none';
        icon.textContent = '▼';
    }
}

function deleteMedicine(id) {
    medicines = medicines.filter(m => m.id !== id);
    renderMedicines();
    renderCalendar();
    updateUpcomingMeds();
}

function editMedicine(id) {
    const med = medicines.find(m => m.id === id);
    if (!med) return;
    document.getElementById('medicineName').value = med.name;
    document.getElementById('dosage').value       = med.dosage;
    document.getElementById('frequency').value    = med.frequency;
    document.getElementById('durationValue').value= med.durationValue;
    document.getElementById('durationType').value = med.durationType;
    document.getElementById('startDate').value    = med.startDate;
    showAddMedicineForm();
    deleteMedicine(id);
}

function updateUpcomingMeds() {
    const upcomingList = document.getElementById('upcomingMedsList');
    const upcoming     = medicines
        .filter(m => !m.taken)
        .sort((a,b) => new Date(a.startDate) - new Date(b.startDate))
        .slice(0,3);
    upcomingList.innerHTML = upcoming.map(med => `
        <div class="upcoming-med-item">
            <h4>${med.name}</h4>
            <p>${med.dosage} - ${med.frequency}</p>
            <p>Start: ${new Date(med.startDate).toLocaleDateString()}</p>
        </div>
    `).join('');
}

// Close modals when clicking outside
window.onclick = function(event) {
    const addModal  = document.getElementById('addMedicineModal');
    const markModal = document.getElementById('markAsTakenModal');
    if (event.target === addModal)  hideAddMedicineForm();
    if (event.target === markModal) hideMarkAsTakenModal();
};

// Initialize everything on load
async function initializeApp() {
    await renderMedicines();
    renderCalendar();
    updateUpcomingMeds();
}

window.onload = initializeApp;
