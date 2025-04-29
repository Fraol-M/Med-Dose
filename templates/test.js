let medicines = [];
let currentDate = new Date();

// Calendar Functions
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    document.getElementById('currentMonth').textContent = 
        new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate);
    
    const calendarDates = document.getElementById('calendarDates');
    calendarDates.innerHTML = '';
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
        calendarDates.appendChild(createDateElement(''));
    }
    
    // Add dates
    for (let date = 1; date <= lastDay.getDate(); date++) {
        const dateCell = createDateElement(date);
        const fullDate = new Date(year, month, date);
        
        // Check if there are medicines scheduled for this date
        const hasMedicine = medicines.some(med => {
            const startDate = new Date(med.startDate);
            const endDate = calculateEndDate(med.startDate, med.durationValue, med.durationType);
            return fullDate >= startDate && fullDate <= endDate;
        });
        
        if (hasMedicine) {
            dateCell.classList.add('has-medicine');
        }
        
        // Check if all medicines for this date are taken
        const isCompleted = medicines.every(med => {
            const startDate = new Date(med.startDate);
            const endDate = calculateEndDate(med.startDate, med.durationValue, med.durationType);
            return fullDate >= startDate && fullDate <= endDate ? med.taken : true;
        });
        
        if (isCompleted && hasMedicine) {
            dateCell.classList.add('completed');
        }
        
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
    // Set default start date to today
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
    const medicineId = parseInt(modal.dataset.medicineId);
    
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
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => tab.classList.remove('active'));
    element.classList.add('active');
    
    document.getElementById('overviewTab').classList.toggle('hidden', tabName !== 'overview');
    document.getElementById('calendarTab').classList.toggle('hidden', tabName !== 'calendar');
    
    if (tabName === 'calendar') {
        renderCalendar();
    }
}


function handleAddMedicine(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);  // Get form data from the event target (the form)
    
    // Send the form data to Django using fetch
    fetch("{% url 'add_medicine' %}", {  // Replace with your URL
        method: "POST",
        body: formData,
        headers: {
            "X-CSRFToken": document.querySelector('[name=csrfmiddlewaretoken]').value,  // CSRF token
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "success") {
            // Handle success - you could update the UI, render the calendar again, etc.
            medicines.push({
                id: data.medicine_id,  // Assuming that the Django view returns the new medicine id
                name: formData.get('medicineName'),
                dosage: formData.get('dosage'),
                frequency: formData.get('frequency'),
                durationValue: formData.get('durationValue'),
                durationType: formData.get('durationType'),
                startDate: formData.get('startDate'),
                taken: false,
            });
            renderMedicines();
            renderCalendar();
            updateUpcomingMeds();
            hideAddMedicineForm();
            event.target.reset();  // Reset the form after submission
        } else {
            // Handle error - display error message or log it
            document.getElementById('responseMessage').textContent = "Error adding medicine: " + data.message;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('responseMessage').textContent = "There was a problem with the request.";
    });
}


function deleteMedicine(id) {
    medicines = medicines.filter(med => med.id !== id);
    renderMedicines();
    renderCalendar();
    updateUpcomingMeds();
}

function editMedicine(id) {
    const medicine = medicines.find(med => med.id === id);
    if (!medicine) return;

    document.getElementById('medicineName').value = medicine.name;
    document.getElementById('dosage').value = medicine.dosage;
    document.getElementById('frequency').value = medicine.frequency;
    document.getElementById('durationValue').value = medicine.durationValue;
    document.getElementById('durationType').value = medicine.durationType;
    document.getElementById('startDate').value = medicine.startDate;
    
    showAddMedicineForm();
    deleteMedicine(id);
}

function updateUpcomingMeds() {
    const upcomingList = document.getElementById('upcomingMedsList');
    const now = new Date();
    
    const upcoming = medicines
        .filter(med => !med.taken)
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
        .slice(0, 3);
    
    upcomingList.innerHTML = upcoming.map(med => `
        <div class="upcoming-med-item">
            <h4>${med.name}</h4>
            <p>${med.dosage} - ${med.frequency}</p>
            <p>Start: ${new Date(med.startDate).toLocaleDateString()}</p>
        </div>
    `).join('');
}

function renderMedicines() {
    const medicineList = document.getElementById('medicineList');
    medicineList.innerHTML = medicines.map(medicine => `
        <div class="medicine-card">
            <h3>${medicine.name}</h3>
            <p><strong>Dosage:</strong> ${medicine.dosage}</p>
            <p><strong>Frequency:</strong> ${medicine.frequency}</p>
            <p><strong>Duration:</strong> ${medicine.durationValue} ${medicine.durationType}</p>
            <p><strong>Start Date:</strong> ${new Date(medicine.startDate).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${medicine.taken ? 'Taken' : 'Pending'}</p>
            <div class="button-group">
                ${!medicine.taken ? `
                    <button onclick="showMarkAsTakenModal(${medicine.id})" class="success-btn">Mark as Taken</button>
                ` : ''}
                <button onclick="editMedicine(${medicine.id})" class="edit-btn">Edit</button>
                <button onclick="deleteMedicine(${medicine.id})" class="delete-btn">Delete</button>
            </div>
        </div>
    `).join('');
}

// Initial render
renderMedicines();
updateUpcomingMeds();

// Close modal when clicking outside
window.onclick = function(event) {
    const addModal = document.getElementById('addMedicineModal');
    const markModal = document.getElementById('markAsTakenModal');
    if (event.target === addModal) {
        hideAddMedicineForm();
    } else if (event.target === markModal) {
        hideMarkAsTakenModal();
    }
}