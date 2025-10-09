let id = '9505fd1df737e20152fbd78cdb289b6a';
// ⚠️ NEW URL for 5 Day / 3 Hour Forecast API
let url = 'https://api.openweathermap.org/data/2.5/forecast?units=metric&appid=' + id;

// DOM Elements
let city = document.querySelector('.name');
let form = document.querySelector("form");
let description = document.querySelector('.description');
let valueSearch = document.getElementById('name');
let clouds = document.getElementById('clouds');
let humidity = document.getElementById('humidity');
let pressure = document.getElementById('pressure');
let main = document.querySelector('main');
let tempValue = document.getElementById('temp-value');
let weatherImageDiv = document.getElementById('weather-image');
// NEW DOM Element
let hourlyForecastContainer = document.getElementById('hourly-forecast-container');


/**
 * Helper to convert Unix timestamp to local time string (e.g., "10 AM")
 * @param {number} timestamp - The Unix timestamp from the API.
 * @param {number} timezoneOffset - The timezone shift in seconds from UTC.
 * @returns {string} Formatted local time string.
 */
const formatTime = (timestamp, timezoneOffset) => {
    // Convert UTC timestamp to local time using the offset
    const utcMilliseconds = timestamp * 1000;
    const localTime = new Date(utcMilliseconds + (timezoneOffset * 1000));
    
    // Format the time as 'X AM/PM'
    const hours = localTime.getUTCHours();
    const minutes = localTime.getUTCMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12; // Convert 0 to 12
    
    // Check if it's the start of the day (00:00 UTC) to mark it as the next day
    if (minutes === 0) {
        return `${hour12} ${ampm}`;
    }
    // A simplified approach for 3-hour forecast API:
    return `${hour12} ${ampm}`;
};


/**
 * Renders the hourly forecast data into the container.
 * @param {Array} forecastList - The 'list' array from the API response.
 * @param {number} timezoneOffset - The timezone shift in seconds from UTC.
 */
const renderHourlyForecast = (forecastList, timezoneOffset) => {
    // Clear previous forecast
    hourlyForecastContainer.innerHTML = '';
    
    // We want to show the next 8 predictions (24 hours since it's 3-hour steps)
    const predictionsToShow = 8; 
    
    // Create HTML for each hourly prediction
    for (let i = 0; i < Math.min(forecastList.length, predictionsToShow); i++) {
        const hourlyData = forecastList[i];
        const timeString = formatTime(hourlyData.dt, timezoneOffset);
        const iconCode = hourlyData.weather[0].icon;
        const temp = Math.round(hourlyData.main.temp);
        
        const hourlyCard = document.createElement('div');
        hourlyCard.classList.add('hourly-card');
        
        hourlyCard.innerHTML = `
            <p class="hourly-time">${timeString}</p>
            <img src="https://openweathermap.org/img/wn/${iconCode}@2x.png" alt="${hourlyData.weather[0].description}">
            <p class="hourly-temp">${temp}<sup>°</sup></p>
        `;
        
        hourlyForecastContainer.appendChild(hourlyCard);
    }
};


/**
 * Determines if the current time for the city is during sunrise or sunset.
 * NOTE: This logic now uses the first item in the 'list' array for current conditions.
 * @param {number} sunriseTime - Unix timestamp for sunrise.
 * @param {number} sunsetTime - Unix timestamp for sunset.
 * @param {number} currentTime - Unix timestamp for the current time in the city (dt of the first forecast).
 * @returns {{isMorning: boolean, isEvening: boolean}}
 */
const getSunTimeState = (sunriseTime, sunsetTime, currentTime) => {
    // 30 minutes (1800 seconds) before and after sunrise/sunset is a good range for transition
    const transitionWindow = 1800; 
    const isMorning = (currentTime >= (sunriseTime - transitionWindow)) && (currentTime < (sunriseTime + transitionWindow));
    const isEvening = (currentTime >= (sunsetTime - transitionWindow)) && (currentTime < (sunsetTime + transitionWindow));
    return { isMorning, isEvening };
}


/**
 * Maps the OpenWeatherMap icon code to a local image path.
 */
const getWeatherImagePath = (iconCode, isMorning, isEvening) => {
    const imagePath = 'images/'; 
    const isDay = iconCode.endsWith('d'); 
    const mainCondition = iconCode.substring(0, 2);

    switch(mainCondition) {
        case '01': // Clear Sky
            if (isMorning) {
                return `${imagePath}clear_morning.jpg`; 
            } else if (isEvening) {
                return `${imagePath}clear_evening.jpg`; 
            } else {
                return isDay ? `${imagePath}clear_day.jpg` : `${imagePath}clear_night.jpg`;
            }
        case '02': 
        case '03': 
        case '04': 
            return isDay ? `${imagePath}clouds_day.jpg` : `${imagePath}clouds_night.jpg`;
        case '09': 
        case '10': 
            return isDay ? `${imagePath}rain_day.jpg` : `${imagePath}rain_night.jpg`;
        case '11': 
            return `${imagePath}lightning.jpg`; 
        case '13': 
            return `${imagePath}snow.jpg`; 
        case '50': 
            return `${imagePath}mist.jpg`; 
        default:
            return `${imagePath}default.jpg`; 
    }
}


form.addEventListener("submit", (e) => {
    e.preventDefault(); 
    if(valueSearch.value.trim() !== ''){
        searchWeather();
    }
});

const searchWeather = () => {
    // Reset/Loading state
    weatherImageDiv.style.backgroundImage = 'none'; 
    description.innerText = 'Fetching weather...';
    tempValue.innerText = '--';
    hourlyForecastContainer.innerHTML = '<p style="padding:10px;">Loading hourly data...</p>';

    fetch(url+'&q='+ valueSearch.value)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            
            // The 5-day API returns 'cod' as a string "200" for success
            if(data.cod == '200'){
                // The current weather data is contained in the first item of the 'list' array
                const currentData = data.list[0];
                
                // Get city-wide data (name, country, timezone, sunrise/sunset)
                const cityData = data.city;

                // --- 1. Update Main Weather Data (using the first forecast entry) ---
                city.querySelector('figcaption').innerHTML = cityData.name;
                city.querySelector('img').src = `https://flagsapi.com/${cityData.country}/shiny/32.png`;
                tempValue.innerText = Math.round(currentData.main.temp); 
                description.innerText = currentData.weather[0].description;
                
                // Update Weather Details (Clouds, Humidity, Pressure)
                clouds.innerText = currentData.clouds.all;
                humidity.innerText = currentData.main.humidity;
                pressure.innerText = currentData.main.pressure;
                
                // --- 2. Set the dynamic image ---
                const iconCode = currentData.weather[0].icon;
                const { isMorning, isEvening } = getSunTimeState(
                    cityData.sunrise, 
                    cityData.sunset, 
                    currentData.dt 
                );
                const imagePath = getWeatherImagePath(iconCode, isMorning, isEvening);
                weatherImageDiv.style.backgroundImage = `url('${imagePath}')`; 
                
                // --- 3. Render Hourly Forecast ---
                renderHourlyForecast(data.list, cityData.timezone);

            } else {
                // Handle city not found (cod is usually '404')
                main.classList.add('error');
                description.innerText = data.message || 'City not found';
                hourlyForecastContainer.innerHTML = '';
                setTimeout(() => {
                    main.classList.remove('error');
                }, 1000);
            }
            valueSearch.value = '';
        })
        .catch(error => {
            console.error('Error fetching weather data:', error);
            description.innerText = 'Could not connect to server.';
            hourlyForecastContainer.innerHTML = '';
        });
}

// search Default
const initApp = () => {
    valueSearch.value = 'Bhopal'; // Initial city
    searchWeather();
}

// Run the initialization function
initApp();