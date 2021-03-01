// .postful is a modern take on the old concept of postcards created by Charles Wong.  The anticipation of receiving a postcard from family or friends is always a big part of the experience.  We never know which postcard we will receive or what the message will say.  .postful aims to recreate this precious, time-tested experience using an intuitive and beautiful UI and logical UX that puts the focus on sending an amazing piece of art itself.  Designed and programmed by Charles Wong.

// The underlying workings:
// 1) User visits the the webpage
// 2) They are then presented with a piece of author-curated art selected at random from the Rijks Museum API that adorns the front of their postcard 
// 3) The background of the front of the postcard is rendered based on the most prevalent colour in the artwork and also used as one of the 5 input color values to feed the second API (colorMind API).  If the Rijks API does not have a color array available for the current artwork, then the background of the front of the postcard is simply set to be the same as the rear of the postcard's (at a later step)
// 4) Meanwhile, the title of the artwork is added to the rear of the postcard
// 5) .postful retrieves a sequence of 5 aesthetically pleasing and coordinated colours based on an the colorMind AI engine.
// 6) The colors generated in step 5 are strategically rendered onto the text, background, date stamp, and border colors at the back of the postcard.
// 7) Users may, at the discretion, select another colour sequence by clicking on or beneath the colour strip under the .postful title.  
// 8) Form validation is implemented for the postcard, ensuring that emails are both valid and filled out before they are allowed to send the postcard.
// 9) Once ready, the user clicks the "Stamp & Send" button to "send" the postcard.
// 10) A stamp & send animation sequence begins.  The postage stamp is rendered onto the postcard at a random angle between -5 to +5 degrees to simulate the human experience of applying a postage stamp.  After the stamp is applied, the date stamp with today's date is added to the postcard.  Finally, an alert window with "Postcard sent!" is shown to the user.  The form is then cleared and ready for the user to send another postcard.

// App object
app = {};

// rijks API key
app.rijksAPIKey = `DnPSEVZA`;

// Stores current rijks search results
app.rijksResults = {};

// Stores filtered rijks search object indices where image width > height
app.filteredRijksIndices = [];

// Stores the random image from the rijks search results list of objects
app.randomIMG = {};

// Stores current random image ID
app.randomImgID = '';

// Stores the details of the currently displayed artwork
app.artworkDetails = {};

// Base URL for the colormind API
app.colorAPIURL = `http://colormind.io/api/`;

// Base URL for Rijks Museum API
app.rijksBaseURL = `https://www.rijksmuseum.nl/api/en/collection`;

// Stores the most prevalent color from the present artwork as an RGB array
app.artPrevalentColor = [];

// Holds the color data to feed the colorMind API
app.colorData = {
    // Specifies the 'default' colour model used by the API for generating coordinated color outputs.
    model: 'default',
    // Input is an array of 5 sub arrays.  Each sub array represents one RGB color within the color strip .colPaletteContainer.  The array items in index 0 and index 4 are locked input colors to the API (The API is asked to return a colour array with these locked values as close as possible to what we listed).  On the other hand, index 2, 3, and 5 are marked with "N", which prompts the API to suggest appropriate colors based on its AI engine to coordinate with the two lock (chosen) colours in index 0 and index 4.
    // These input colors are the default colors to feed the colorMind API.  If the currently selected artwork has its color array info. available, then either index 0 or index 4 in the input array below will be set with the artwork's most prevalent color so that the API will suggest coordinating colors to match with it.
    input: [[115, 102, 75], "N", "N", "N", [224, 223, 218]],
}

// Stores the current color palette
app.currentPalette = [];

// Hex to RGB converter
app.convertHexToRGB = (hexCode) => {
    let r = 0, g = 0, b = 0;
    let colArray = [];

    if (hexCode.length == 7) {
        r = "0x" + hexCode[1] + hexCode[2];
        g = "0x" + hexCode[3] + hexCode[4];
        b = "0x" + hexCode[5] + hexCode[6];
    }

    //Convert r, g, and b from hexadecimal to int.
    r = parseInt("" + +r + "");
    g = parseInt("" + +g + "");
    b = parseInt("" + +b + "");
    colArray = [r, g, b];

    app.artPrevalentColor = colArray;
    return colArray;
}

// Checks to see if the most prevalent color in the artwork is closer to black or white and then decide if we should substitute index 0 or index 4 in the colorData input array with this most prevalent color
app.colorComparator = (rgbArray) => {
    const darkComp = [];
    const lightComp = [];

    for (let index = 0; index < rgbArray.length; index++) {
        darkComp[index] = Math.abs(0 - rgbArray[index]);
        lightComp[index] = Math.abs(255 - rgbArray[index]);
    }

    // Add up the total dark score (deviation of color from 100% dark)
    const darkScore = darkComp[0] + darkComp[1] + darkComp[2];
    // Add up the total light score (deviation of color from 100% white)
    const lightScore = lightComp[0] + lightComp[1] + lightComp[2];

    if (lightScore < darkScore) {
        // place artPrevalent color in colorMind color input array index 4
        app.colorData.input[4] = rgbArray;
    } else {
        // place artPrevalent color in colorMind color input array index 0
        app.colorData.input[0] = rgbArray;
    }
}

// Make an API call to the Rijks API to get information about the collection 
app.getRijksList = (randPage, currentURL) => {
    const rijksResponse = $.ajax({
        url: currentURL,
        dataType: `json`,
        method: `GET`,
        data: {
            key: app.rijksAPIKey,
            format: 'json',
            culture: 'en',
            imgonly: 'true',
            toppieces: 'true',
            type: 'painting',
            ps: '100',
            //p specifies page # of results. There are 4 in total for this search
            p: `${randPage}`,
            q: 'landscape',
            //Adds randomImgID to search if specified.  If empty, then the ajax call simply outputs 100 images based on the specified criteria
            id: `${app.randomImgID}`
        }
    }).then(results => {
        // If we are searching in the rijksBaseURL(i.e.: we are NOT searching for details of an image instead)
        if (currentURL === app.rijksBaseURL) {
            app.rijksResults = results.artObjects;
            app.setPostCardIMG();
            app.setLongTitle();
            return results.artObjects;
        } else {
            // If we are searching for details of an artwork:
            app.artworkDetails = results.artObject;
            // If there is indeed a prevalent color in the artwork (color array wasn't empty), then converts the postcard's most prevalent color to from hex to RGB and store it to the app.artPrevalentColor variable.  Also uses app.colorComparator to compare and substitute either index 0 or index 4 of the colorMind API input color array as appropriate.
            if (app.setPostFrontCol() !== false) {
                app.convertHexToRGB(app.setPostFrontCol());
                app.colorComparator(app.artPrevalentColor);
            }
            app.getColor(true);
            return results.artObject;
        }
    });
};

// Set the front background colour of the postcard if an image color array is available from the Rijks API
app.setPostFrontCol = () => {
    if (app.artworkDetails.colors.length > 0) {
        // Find highest percentage color
        const popCol = app.findImgPop(app.artworkDetails.colors);
        $('.postcardFront').css('background-color', `${popCol[1]}`);
        // Returns the most prevalaent color from the artwork
        return popCol[1];
    }
    else {
        return false;
    }
}

// Sets postcard front background to be the same as its postcard rear background color (used when color array info not available for current artwork)
app.setPostFrontColAnon = () => {
    $('.postcardFront').css('background-color', `rgba(${app.currentPalette[4][0]}, ${app.currentPalette[4][1]}, ${app.currentPalette[4][2]}, 0.25)`);
}

// Finds the colour with the highest % representation in the image
app.findImgPop = (colorsArray) => {
    const modeCol = [0, "#000000"];
    for (let index = 0; index < colorsArray.length; index++) {
        if (colorsArray[index].percentage > modeCol[0]) {
            modeCol[0] = colorsArray[index].percentage;
            modeCol[1] = colorsArray[index].hex;
        }
    }
    // Clean up image color array if its hex code has blanks in it.
    modeCol[1] = modeCol[1].trim();
    return modeCol;
}

// Function to generate random results page if "isValid = True"
app.getRandomResultPg = (isValid) => {
    if (isValid) {
        return Math.floor(Math.random() * 4) + 1;
    } else {
        return 1;
    }
}

// Function to get the long title of the current artwork and then add it to the postcard rear
app.setLongTitle = () => {
    $('.formBottom p').text(`${app.randomIMG.longTitle}`);
}

// Function to set the front image of the postcard with a random result from the Rijks API call where the image has a landscape proportion
app.setPostCardIMG = () => {
    app.randomIMG = app.rijksResults[app.filterLandscapeIMG()];
    $('.postcardIMG').attr('src', `${app.randomIMG.webImage.url}`);
}

// Helper function to filter out landscape format (width > height) photos only
app.filterLandscapeIMG = () => {
    app.rijksResults.forEach((currentIMG, currentIndex) => {
        const imgHeight = `${app.rijksResults[currentIndex].webImage.height}`;
        const imgWidth = `${app.rijksResults[currentIndex].webImage.width}`;
        // Store the current index of the image in the app.filteredRijksIndices array if the current image's width > its height
        if (imgWidth > imgHeight) {
            app.filteredRijksIndices.push(currentIndex);
        }
    });
    return app.randomizer();
}

// Randomizer helper function. Returns the value (index of original Rijks results array) associated with the random index in the filteredRijksIndices array
app.randomizer = () => {
    const randomIndex = Math.floor(Math.random() * app.filteredRijksIndices.length);
    return app.filteredRijksIndices[randomIndex];
}

// Function to get the randomized color array from colormind API
// Also invokes the set randomized color array function setColor(colorPalette)
app.getColor = (onLoadReq) => {
    const http = new XMLHttpRequest();
    http.open("POST", app.colorAPIURL, true);
    http.send(JSON.stringify(app.colorData));
    // When data is ready, then:
    http.onreadystatechange = function () {
        if (http.readyState == 4 && http.status == 200) {
            const palette = JSON.parse(http.responseText).result;
            app.currentPalette = palette;
            app.setColor(palette);
            app.setPostCardColor(palette);

            if (onLoadReq === true) {
                app.nextPalette();
                app.generateStamp();
            }
            if (app.artworkDetails.colors.length === 0) {
                app.setPostFrontColAnon();
            }
            return palette;
        }
    }
}

// Helper function to set the color of .colPaletteContainer based on the currently gernated color palette from the colormind API
app.setColor = (colorPalette) => {
    colorPalette.forEach((color, ind) => {
        $(`.colPaletteContainer div:nth-of-type(${ind + 1})`).css('background-color', `rgb(${colorPalette[ind][0]}, ${colorPalette[ind][1]}, ${colorPalette[ind][2]})`);
    });
}

// Helper function to set postcard colors with current palette colors
app.setPostCardColor = (postcardPalette) => {
    // Color formatting for sender email, recipient email, message, and Stamp & Send" fonts
    $('#senderEmail').css('color', `rgb(${postcardPalette[0][0]}, ${postcardPalette[0][1]}, ${postcardPalette[0][2]})`);
    $('#recipientEmail').css('color', `rgb(${postcardPalette[0][0]}, ${postcardPalette[0][1]}, ${postcardPalette[0][2]})`);
    $('textarea').css('color', `rgb(${postcardPalette[0][0]}, ${postcardPalette[0][1]}, ${postcardPalette[0][2]})`);
    $('.stampHere').css('color', `rgb(${postcardPalette[0][0]}, ${postcardPalette[0][1]}, ${postcardPalette[0][2]})`);

    // Color formatting for "From:" and "To:" labels, and email and textarea backgrounds, border around .stampHere, and image longTitle caption
    $('label[for="senderEmail"]').css('color', `rgb(${postcardPalette[1][0]}, ${postcardPalette[1][1]}, ${postcardPalette[1][2]})`);
    $('label[for="recipientEmail"]').css('color', `rgb(${postcardPalette[1][0]}, ${postcardPalette[1][1]}, ${postcardPalette[1][2]})`);

    $('input[type="email"]').css('background-color', `rgba(${postcardPalette[1][0]}, ${postcardPalette[1][1]}, ${postcardPalette[1][2]}, 0.1)`);
    $('textarea').css('background-color', `rgba(${postcardPalette[1][0]}, ${postcardPalette[1][1]}, ${postcardPalette[1][2]}, 0.1)`);
    $('.stampHere').css('border-color', `rgba(${postcardPalette[1][0]}, ${postcardPalette[1][1]}, ${postcardPalette[1][2]}, 0.1)`);

    $('.formBottom p').css('color', `rgba(${postcardPalette[1][0]}, ${postcardPalette[1][1]}, ${postcardPalette[1][2]}, 0.8)`);

    // jQuery hover (with mouseEnter and mouseLeave arguments)
    $('.stampHere').hover(function () {
        $(this).css('border-color', `rgba(${postcardPalette[1][0]}, ${postcardPalette[1][1]}, ${postcardPalette[1][2]}, 0.8)`);
    },
        function () {
            $(this).css('border-color', `rgba(${postcardPalette[1][0]}, ${postcardPalette[1][1]}, ${postcardPalette[1][2]}, 0.1)`);
        }
    );

    // Color formatting for placeholder words: "your email here" and "recipient email", and asterisks color
    $('input[placeholder="your email here"]').css('color', `rgb(${postcardPalette[2][0]}, ${postcardPalette[2][1]}, ${postcardPalette[2][2]})`);
    $('input[placeholder="recipient email"]').css('color', `rgb(${postcardPalette[2][0]}, ${postcardPalette[2][1]}, ${postcardPalette[2][2]})`);
    $('textarea').css('color', `rgb(${postcardPalette[2][0]}, ${postcardPalette[2][1]}, ${postcardPalette[2][2]})`);
    $('form span').css('color', `rgb(${postcardPalette[2][0]}, ${postcardPalette[2][1]}, ${postcardPalette[2][2]})`);

    // Stamping color
    $('.dateStamp').css('border-color', `rgb(${postcardPalette[3][0]}, ${postcardPalette[3][1]}, ${postcardPalette[3][2]})`);
    $('.dateStamp').css('color', `rgb(${postcardPalette[3][0]}, ${postcardPalette[3][1]}, ${postcardPalette[3][2]})`);

    // Postcard background color
    $('.postcardRear').css('background-color', `rgba(${postcardPalette[4][0]}, ${postcardPalette[4][1]}, ${postcardPalette[4][2]}, 0.25)`);
}

// Function to add event listener to genereate the next colour palette based on the colormind API when user clicks on the color palette strip
app.nextPalette = () => {
    $('.colPaletteContainer').on('click', () => {
        app.getColor(false);
    })
};

// Function to generate postage stamp on submit button click
app.generateStamp = () => {
    $('.stampHere').on('click', (e) => {
        // Remove outline around stamp
        $('.stampHere').css('outline', 'none');

        const senderEmailTypeMisMatch = $('input[type="email"]')[0].validity.typeMismatch;
        const recipientEmailTypeMismatch = $('input[type="email"]')[1].validity.typeMismatch;
        const senderEmailLen = $('input[type="email"]')[0].textLength;
        const recipientEmailLen = $('input[type="email"]')[1].textLength;

        // Check for sender and recipient email length to be valid and also check for their type to be valid emails.  This step is not needed when the form submit function is functional and sends an email to the recipient.
        if (senderEmailLen > 0 && recipientEmailLen > 0) {
            if (senderEmailTypeMisMatch === true || recipientEmailTypeMismatch == true) {
                // Do nothing if email fields are not filled out OR not actual emails
            } else {
                // e.preventDefault() is added since email functionality not yet setup.
                e.preventDefault();

                // Set the date on the dateStamp
                app.setDate(app.getDate());
                // Simulate email sent timeout and animate postage and timestamp removal to signal email sent
                setTimeout(function () {
                    alert("Postcard sent!");
                    // Reset the form
                    document.querySelector("form").reset();
                    // Renders both postage and time stamp hidden
                    app.stampVisibility(false);
                }, 4000);
                app.stampVisibility(true);
            }
        }
    })
};

// Set the current date on the date stamp
app.setDate = (dateString) => {
    $('.dateStamp').text(`Port of Amsterdam, ${dateString}`);
}

// Gets the user's current date
app.getDate = () => {
    const currentDate = new Date();
    // Gets Month
    const options = { month: 'short' };
    const currentMonth = new Intl.DateTimeFormat('en-US', options).format(currentDate);
    // Gets Day of Month
    const currentDateOfMonth = currentDate.getDate();
    // Gets Year
    const currentYear = currentDate.getFullYear();
    return `${currentMonth} ${currentDateOfMonth} ${currentYear}`;
}

// Helper function to randomize stamp application angle between 0 and passed in angle limit.
app.randomAngle = (angleLimit) => {
    const angle = Math.floor(Math.random() * (2 * angleLimit)) - angleLimit;
    return angle;
}

// Helper function to set stamp angle
app.setStampAngle = (specAngle) => {
    $('.stampHere img').css('transform', `rotateZ(${specAngle}deg)`);
}

// Helper function to hide/Show postage stamp and date stamp
app.stampVisibility = (isVisible) => {
    if (isVisible === true) {
        // Generate random stamp applied rotation angle between -(argument) to +(argument)deg
        app.setStampAngle(app.randomAngle(5));
        $('.stampHere div').text('');
        $('.stampHere img').show(0, function () {
            //move date stamp up front
            $('.dateStamp').css('z-index', '10');
            setTimeout(function () {
                //set dateStamp visibility to visible and opacity of 1
                $('.dateStamp').css('visibility', 'visible');
                $('.dateStamp').css('opacity', '1');
                //Fades out date stamp over 600ms
                $('.dateStamp').fadeIn(600);
            }, 2000);
        });
    } else {
        //Fades out date stamp over 600ms
        $('.dateStamp').fadeOut(600);
        // Renders datestamp to be hidden
        setTimeout(function () {
            $('.dateStamp').css('visibility', 'hidden');
            $('.dateStamp').css('opacity', '0');
            //move date stamp to back
            $('.dateStamp').css('z-index', '-1');
        }, 610);
        // Hides and fades out postage stamp after 1 second + 450ms 
        setTimeout(function () {
            $('.stampHere img').fadeOut(450);
        }, 1000);
        // Renders Stamp & send placeholder text
        setTimeout(function () {
            $('.stampHere div').text('Stamp & send');
        }, 1500);
    }
}

// Initialization function
app.init = () => {
    // Get a list of paintings from the Rijks API based on a random page between page 1 and page 4 using the app.rijksBaseURL
    app.getRijksList(app.getRandomResultPg(true), app.rijksBaseURL)
    // Call the Rijks API again after 2s to retrieve details of the currently selected artwork and to set the postcard's front background color based on the artwork's most prevalent color IF a color array is available for the present artwork and if server response is < 2s.
    setTimeout(function () {
        app.getRijksList(1, `${app.rijksBaseURL}/${app.randomIMG.objectNumber}`);
    }, 2000)
};

// Document.ready
$(function () {
    app.init();
});
