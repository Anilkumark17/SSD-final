// A dummy JavaScript file with simple logic

// Function to calculate the square of a number
function square(num) {
    return num * num;
}

// Function to check if a number is even or odd
function isEven(num) {
    return num % 2 === 0;
}

// Array processing example
const numbers = [2, 5, 8, 11, 14];

const squares = numbers.map(n => square(n));
const evenNumbers = numbers.filter(n => isEven(n));
