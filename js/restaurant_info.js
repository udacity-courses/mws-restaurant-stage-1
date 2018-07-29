/* eslint-disable no-console, prefer-destructuring, no-useless-escape, no-debugger */
/* global DBHelper, google */
/** @namespace google.maps */
/** @namespace google.maps.Map */

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/serviceWorker.js")
            .then(() => console.log("Service Worker Registered"))
            .catch(error => console.error("Error registering service worker", error));
    });
    window.addEventListener("online", () => {
        navigator.serviceWorker.ready
            .then(service => service.sync.register("Synchronize"))
            .catch(error => console.error("Service worker not ready", error));
    });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
    fetchRestaurantFromURL()
        .then(id => fetchRestaurantReviews(id))
        .catch(error => console.error("error fetching restaurant", error));
};

/**
 * Get current restaurant from page URL.
 * @return {Promise<Number>} returns the restaurant id
 */
const fetchRestaurantFromURL = () => {
    const id = getParameterByName("id");
    if (!id) { // no id found in URL
        console.error(`No restaurant id ${id} in URL`);
    } else {
        return DBHelper.fetchRestaurantById(id)
            .then(response => {
                fillBreadcrumb(response);
                self.map = new google.maps.Map(document.getElementById("map"), {
                    zoom: 16,
                    center: response.latlng,
                    scrollwheel: false,
                });
                DBHelper.mapMarkerForRestaurant(response, self.map);
                fillRestaurantHTML(response);
                return parseInt(id);
            })
            .catch(error => console.error(error));
    }
};

/**
 * Create restaurant HTML and add it to the web page
 * @param {Object} restaurant
 * @param {Number} restaurant.id
 * @param {string} restaurant.name
 * @param {string} restaurant.address
 * @param {string} restaurant.cuisine_type
 * @param {string} restaurant.is_favorite - is favorite
 * @param {string} restaurant.photograph
 * @param {Object[]} restaurant.operating_hours
 * @param {Object[]} restaurant.reviews
 */
const fillRestaurantHTML = restaurant => {// eslint-disable-line max-statements
    const name = document.getElementById("restaurant-name");
    document.getElementById("restaurant-id").value = restaurant.id;
    name.innerHTML = restaurant.name;
    const favoriteIconSpan = document.getElementById("isFavorite");
    favoriteIconSpan.innerHTML = restaurant.is_favorite === "true" ? "❤️" : "💙";
    favoriteIconSpan.className = "isFavorite";

    const address = document.getElementById("restaurant-address");
    address.innerHTML = restaurant.address;

    const image = document.getElementById("restaurant-img");
    image.className = "restaurant-img";
    image.alt = restaurant.name;
    image.src = DBHelper.imageUrlForRestaurant(restaurant);

    const cuisine = document.getElementById("restaurant-cuisine");
    cuisine.innerHTML = restaurant.cuisine_type;

    if (restaurant.operating_hours) {
        fillRestaurantHoursHTML(restaurant.operating_hours);
    }
    fillReviewsHTML(restaurant.reviews);
};

/**
 * Create restaurant operating hours HTML table and add it to the web page.
 * @param {Object[]} operatingHours
 */
const fillRestaurantHoursHTML = operatingHours => {
    const hours = document.getElementById("restaurant-hours");
    Object.entries(operatingHours).forEach(([key, value]) => {
        const row = document.createElement("tr");

        const day = document.createElement("td");
        day.innerHTML = key;
        row.appendChild(day);

        const time = document.createElement("td");
        time.innerHTML = value;
        row.appendChild(time);
        hours.appendChild(row);
    });
};

/**
 * Create all reviews HTML and add them to the web page.
 * @param {Object[]} reviews
 */
const fillReviewsHTML = reviews => {// eslint-disable-line max-statements
    const container = document.getElementById("reviews-container");
    const title = document.createElement("h2");
    container.innerHTML = "";
    title.innerHTML = "Reviews";
    container.appendChild(title);

    if (!reviews) {
        const noReviews = document.createElement("p");
        noReviews.id = "no-reviews";
        noReviews.innerHTML = "No reviews yet!";
        container.appendChild(noReviews);
    } else {
        const ul = document.createElement("ul");
        ul.id = "reviews-list";
        reviews.forEach(review => {
            ul.appendChild(createReviewHTML(review));
        });
        container.appendChild(ul);
    }
};

/**
 * Create review HTML and add it to the web page.
 * @param {Object} review
 * @param {string} review.name
 * @param {string} review.createdAt - review creation date
 * @param {string} review.rating
 * @param {string} review.comments
 * @return {Element}
 *
 */
const createReviewHTML = review => {// eslint-disable-line max-statements
    const li = document.createElement("li");
    const name = document.createElement("p");
    name.innerHTML = review.name;
    name.className = "review-name";
    li.appendChild(name);

    const date = document.createElement("p");
    date.innerHTML = new Date(review.createdAt).toLocaleDateString();
    date.className = "review-date";
    li.appendChild(date);

    const rating = document.createElement("p");
    rating.innerHTML = `Rating: ${review.rating}`;
    rating.className = "review-rating";
    li.appendChild(rating);

    const comments = document.createElement("p");
    comments.innerHTML = review.comments;
    comments.className = "review-comments";
    li.appendChild(comments);

    return li;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 * @param {Object} restaurant
 * @param {string} restaurant.name
 */
const fillBreadcrumb = restaurant => {
    const breadcrumb = document.getElementById("breadcrumb");
    const li = document.createElement("li");
    li.innerHTML = restaurant.name;
    breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 * @param {string} name
 * @param {string} url
 * @return {string|null}
 */
const getParameterByName = (name, url = window.location.href) => {
    if (!url) {
        url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`);
    const results = regex.exec(url);
    if (!results) {
        return null;
    }
    if (!results[2]) {
        return "";
    }
    return decodeURIComponent(results[2].replace(/\+/g, " "));
};

/**
 * Get form data
 * @return {{name:String, rating:number, comments:string, restaurant_id:Number}} form data
 */
const getFormData = () => ({
    name: document.getElementById("reviewer-name").value || "",
    restaurant_id: document.getElementById("restaurant-id").value,
    rating: document.getElementById("rating").value || 1,
    comments: document.getElementById("review").value || "",
});

/**
 * Fetch Restaurants reviews
 * @param {object} restaurantId - restaurant identifier
 * @return {*}
 */
const fetchRestaurantReviews = restaurantId => DBHelper.fetchReviews(restaurantId)
    .then(response => fillReviewsHTML(response))
    .catch(error => console.error("Error fetching reviews", error));

/**
 * Add review offline
 * @param {object} review - restaurant review
 */
const addOfflineReview = review => {
    const container = document.getElementById("reviews-container");
    const title = document.createElement("h4");
    title.innerHTML = "Reviews";
    container.appendChild(title);
    const ul = document.getElementById("reviews-list");
    ul.appendChild(createReviewHTML(review));
    container.appendChild(ul);
};

/**
 * Favorite a restaurant
 */
const favoriteRestaurant = () => {// eslint-disable-line no-unused-vars
    const favoriteIconHtml = document.getElementById("isFavorite");
    const data = {
        id: document.getElementById("restaurant-id").value,
        is_favorite: favoriteIconHtml.innerHTML === "❤️" || false,
    };
    if (navigator.onLine) {
        data.isFavorited = !data.is_favorite;
        DBHelper.favoriteRestaurant(data)
            .then(() => favoriteIconHtml.innerHTML = data.is_favorite ? "❤️" : "💙")
            .catch(error => console.error("Unable to favorite restaurant", error));
    } else {
        data.isFavorited = !data.is_favorite;
        favoriteIconHtml.innerHTML = data.is_favorite ? "❤️" : "💙";
        saveLocalFavorite({id: data.id, isFavorited: data.is_favorite, type: "favorite"});
    }
};

/**
 * save favorite  on localStorage
 * @param {object} favorite - restaurant review
 */
const saveLocalFavorite = favorite => {
    console.log("saving local favorite");
    navigator.serviceWorker.ready
        .then(service => service.active.postMessage({
            type: "favorite",
            payload: favorite,
        }))
        .catch(error => console.error("failed sending message to SW", error));
};


/**
 * save review  on localStorage
 * @param {object} review - restaurant review
 */
const saveLocalReview = review => {
    navigator.serviceWorker.ready
        .then(service => service.active.postMessage({
            type: "review",
            payload: review,
        }))
        .catch(error => console.error("Error sending review to service worker", error));
};

/**
 * Send Restaurant Review.
 * called from restaurant.html
 */
const sendReview = () => {// eslint-disable-line no-unused-vars
    const form = document.getElementById("review_form");
    const data = getFormData();
    if (navigator.onLine) {
        DBHelper.postReview(data).then(() => {
            form.reset();
            fetchRestaurantReviews(document.getElementById("restaurant-id").value);
            return true;
        }).catch(error => console.error("Review posting failed", error));
    } else {
        const review = Object.assign({}, data, {
            createdAt: Date.now(),
            type: "review",
            id: data.createdAt,
        });
        addOfflineReview(review);
        saveLocalReview(review);
        form.reset();
    }
};
