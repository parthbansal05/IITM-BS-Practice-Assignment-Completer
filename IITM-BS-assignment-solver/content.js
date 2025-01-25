function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function completeAssignment() {
    const clickButton = (selector) => {
        const button = document.querySelector(selector);
        if (button) button.click();
    };

    clickButton('button.gcb-button.qt-check-answer-button');

    setTimeout(async () => {
        while (document.querySelector('button.btn-cancel')) {
            clickButton('button.btn-cancel');
            await wait(1000);
        }

        document.querySelectorAll('div.faculty-answer').forEach(facultyAnswer => {
            facultyAnswer.querySelectorAll('label').forEach(label => label.click());
        });

        document.querySelectorAll('div.qt-response').forEach(qtResponseDiv => {
            const parentDiv = qtResponseDiv.closest('div.gcb-question-row');
            if (parentDiv) {
                const facultyAnswerDiv = parentDiv.querySelector('div.faculty-answer');
                if (facultyAnswerDiv) {
                    let answerValue = facultyAnswerDiv.textContent.trim();
                    if (answerValue.startsWith('(Type: String)')) {
                        answerValue = answerValue.replace('(Type: String)', '').trim();
                    } else if (answerValue.startsWith('(Type: Numeric)')) {
                        answerValue = Number(answerValue.replace('(Type: Numeric)', '').trim());
                    } else if (answerValue.startsWith('(Type: Range)')) {
                        const range = answerValue.replace('(Type: Range)', '').trim();
                        const [min, max] = range.split(',').map(Number);
                        answerValue = min;
                    }

                    const inputField = qtResponseDiv.querySelector('input');
                    if (inputField) inputField.value = answerValue;
                }
            }
        });

        clickButton('button.gcb-button.qt-check-answer-button');
        await wait(1000);
        clickButton('button.btn-submit');
    }, 1000);
}

completeAssignment();