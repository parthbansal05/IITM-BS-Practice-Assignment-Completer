function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(function() {
    const myButton = document.querySelector('button.gcb-button.qt-check-answer-button');
    if (myButton) myButton.click();

    setTimeout(async () => {
        
        let cancelButton;
        while ((cancelButton = document.querySelector('button.btn-cancel')) !== null) {
            cancelButton.click();
            await wait(1000);
        }

        const facultyAnswers = document.querySelectorAll('div.faculty-answer');
        facultyAnswers.forEach(facultyAnswer => {
            const subDivs = facultyAnswer.querySelectorAll('div');
            if (subDivs.length > 0) {
                // Click all labels inside the faculty-answer div
                const labels = facultyAnswer.querySelectorAll('label');
                labels.forEach(label => label.click());
            }
        });

        const qtResponseDivs = document.querySelectorAll('div.qt-response');
        qtResponseDivs.forEach(qtResponseDiv => {
            const parentDiv = qtResponseDiv.closest('div.gcb-question-row');
            if (parentDiv) {
                const facultyAnswerDiv = parentDiv.querySelector('div.faculty-answer');
                if (facultyAnswerDiv) {
                    let answerValue = facultyAnswerDiv.textContent;
                    if (answerValue.startsWith('(Type: String)')) {
                        answerValue = answerValue.replace('(Type: String)', '').trim();
                    }
                    if (answerValue.startsWith('(Type: Numeric)')) {
                        answerValue = answerValue.replace('(Type: Numeric)', '').trim();
                        answerValue = Number(answerValue); // Convert to number
                    }
                    const inputField = qtResponseDiv.querySelector('input');
                    if (inputField) {
                        inputField.value = answerValue; // Set the value of the input field
                    }
                }
            }
        });

        const myButton = document.querySelector('button.gcb-button.qt-check-answer-button');
        if (myButton) myButton.click();

        wait(1000);

        const submitButton = document.querySelector('button.btn-submit');
        if (submitButton) submitButton.click();

        
    }, 1000);
})();


