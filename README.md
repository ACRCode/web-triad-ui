# UI Controls for Web Triad 

This instruction contains information on the use of ui-controls for Review and Uploading of images.

# Installation

Necessary files to use controls are located in the folder [distr](https://github.com/acrscm/web-triad-ui/tree/version_0.1.0/dist/)

Files can be obtained via [Bower package manager](https://bower.io/#getting-started)

```sh
$ bower install web-triad-ui-controls
```
It is necessary to keep the received structure of folders for addition of files in the project:

* uiControls (including this folder)
    * Css
    * Fonts
    * Images
    * Scripts

# Dependencies

This bower package depends on
* jQuery v2.2.4
* jQuery UI - v1.12.1

# Usage
## Review control
1. Include jQuery, jQueryUI scripts and following files on the page:

        <script src="~/Content/uiControls/Scripts/webTriadService.js"></script>
        <script src="~/Content/uiControls/Scripts/reviewControl.js"></script>
        
        <link rel="stylesheet" href="~/Content/uiControls/Css/tcStyle.css">

2. Declare a placeholder for Upload control: put empty `<div>` element into your HTML and provide id/class/whatever which will allow to identify this element within a page DOM tree:

        <div id="reviewControl"></div>

3. Create ‘reviewerSubmittedFiles’ ui-control for any jQuery element and assign the necessary parameters to ‘reviewData’ variable:

        <div id=”reviewControl”></div>
        <script>
        var control = $("#reviewControl").reviewerSubmittedFiles({
                            reviewData: reviewData,                   
                            ...
                            }
                        });
        </script>

    The value of ‘reviewData’ is a JavaScript Array consisting of objects ‘{Name: “name”, Value: “value”}’. For example:

        [
        {Name: “CaseID”, Value: “Case1”},
        {Name: “CourseName”, Value: “CourseName1”},
        {Name: “OrganSystem”, Value: “OrganSystem1”},
        {Name: “OrganLocation”, Value: “OrganLocation1”}
        ]

4. Assign value to ‘serviceParam’

        var control = $("#reviewControl").reviewerSubmittedFiles({
                            ...
                            serviceParam: serviceParam,                   
                            ...
                            }
                        });

    The value of ‘serviceParam’ is a JavaScript Object consisting of following properties:

        serverApiUrl – the endpoint URL for WebTriadServices
        dicomDisabled – disabling DICOM files support
        nonDicomDisabled – disabling Non-DICOM files support

    For example:

        {
        serverApiUrl: "http://cuv-triad-app.restonuat.local/api",
        dicomsDisabled: true,
        nonDicomsDisabled: false
        }

5. Define function 'getSecurityToken', which is called for receiving a token before operations on files.

        var control = $("#reviewControl").reviewerSubmittedFiles({
                            ...                   
                            getSecurityToken: function() {
                                return getToken();
                            },
                            ...  
                        });

    This function should return a string value of token, for example:

        bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6ImZ0QWZjSVozZjFIaUpHMlZCWS1sd0ZkOUlTdyJ9.eyJpc3MiOiJBQ1IiLCJhdWQiOiJhM2UwMjhiZjI0OWU0NTEwODQ4NzQwY2E1MmU0YTYwYyIsImV4cCI6MTUxMTIwMjMwNSwibmJmIjoxNTExMTU5MTA1LCJhY2Nlc3NMaXN0IjpbeyJDYXNlSWQiOiIqIiwiQ291cnNlTmFtZSI6IioiLCJPcmdhblN5c3RlbSI6IioiLCJPcmdhbkxvY2F0aW9uIjoiKiJ9XSwiY2xpZW50TmFtZSI6IkFJUlAiLCJzY29wZXMiOltbInVwbG9hZCIsInJldmlldyIsImRlbGV0ZSJdXX0.pcOMmWZRuek2HPVJ1J24W96HY87L93F7udgbldcrQ2VwAc29NBDgzrkm7aB2c9HnDBC3NJvPrtt-rDTYg5fkVwKIY_gFz0oasUq4FicuKezuIS5JYFW1ApeYly0_nadGVLKN1gb8tXO8xqS8ft3uSTF4cOZzfRurBVx112tHpxmX3cEEXKp7FwNktX7MqVPEHK8fUD9FiDLKZbzUtdltsdKAlOFgmfOw3M1XmRwPMyjv48cACkmZMbVxDi1J9997SDGQSyKUql4w0mCVsAHv28EKCmg9BlcuoQgu1yuFjdBJT6PhQGgikqTteRHsqkjhc6rskyTmgyKzd9O_64ITjTMEvGcL7ko6Iqlgo7_jDhJUSGGVR6f-2AlpvnizQNv22B-wcvjmZF26Sr-yS39Jc37iDdlI-ItHJjiPG10T_7TMfANQroNgGVL-120b1GQsr8xLM0ECsw7ec63Oe9s_WdlJM--TUtwRTx4Rfrfzm9o84A7CjQcWY8cXXIq_P6chwKoQOAfXp21yTKffPVl4rMVsCHxkqAstAaKvSDQ0UrbGh0GHH7GN4didmvB6tNUQ4qVSYiJNs3nZvyxy7r3rY859lDasGDpgGdgF0stryE7j6J-9g9utnH3Kywde3_Gi9vW58B5AN4BNoPNGhddbJVg1luXZQf-mjixmO9xm3fw
    
    Alternatively, to set a new token once it is necessary to call following method:

        control.reviewerSubmittedFiles("setSecurityToken", token);

    ‘token’ is a string value.

    When using ‘setSecurityToken’ method, you must either not define 'getSecurityToken' function or to be ensure that 'getSecurityToken' returns null.

6. Define ‘onErrorEvent’ function, which is called when any errors are getting.

        var control = $("#reviewControl").reviewerSubmittedFiles({
                            ...                   
                            onErrorEvent: function(errorObj) {
                            let str = errorObj.date.toLocaleTimeString()
                            + " | Error " + errorObj.step
                            + ": " + errorObj.statusText
                            + "." + errorObj.message;
                            console.log(str);
                        },                 
                        ...   
                        });

    This function provides a parameter ‘errorObj’ that contains info about error. Its properties:

        date – the date,
        step – the processing step of the sending process,
        statusText – the response's status message as returned by the server,
        message – the error message.

7. To display the delete buttons, assign the parameter 'isImagesRemovingAllowed' as `true`:

        var control = $("#reviewControl").reviewerSubmittedFiles({
                            ...                   
                            isImagesRemovingAllowed: true,
                            ...  
                        });

## Upload control

1. Include jQuery, jQueryUI scripts and following files on the page:

        <script src="~/Content/uiControls/Scripts/webTriadService.js"></script>
        <script src="~/Content/uiControls/Scripts/uploadStatusComponent.js"></script>
        <script src="~/Content/uiControls/Scripts/uploadTask.js"></script>
        <script src="~/Content/uiControls/Scripts/uploadQueueHandleService.js"></script>
        <script src="~/Content/uiControls/Scripts/uploadControl.js"></script>
        
        <link rel="stylesheet" href="~/Content/uiControls/Css/tcStyle.css">

2. Declare a placeholder for Upload control: put empty `<div>` element into your HTML and provide id/class/whatever which will allow to identify this element within a page DOM tree:

        <div id="uploadControl"></div>

3. Create ‘uploaderFiles’ ui-control for any jQuery element and assign the necessary submission parameters to ‘uploadData’ variable:

        <div id="uploadControl"></div>
        <script>
        var control = $("#uploadControl").uploaderFiles({
                            uploadData: uploadData,                   
                            ...
                            }
                        });
        </script>

    The value of ‘uploadData’ is a JavaScript Array consisting of objects ‘{Name: “name”, Value: “value”}’. For example:

        [
            {Name: "CaseID", Value: "Case1"},
            {Name: "CourseName", Value: "CourseName1"},
            {Name: "OrganSystem", Value: "OrganSystem1"},
            {Name: "OrganLocation", Value: "OrganLocation1"}
        ]

4. Assign value to ‘serviceParam’

        var control = $("#uploadControl").uploaderFiles({
                            ...
                            serviceParam: serviceParam,                   
                            ...
                            }
                        });

    The value of ‘serviceParam’ is a JavaScript Object consisting of following properties:

        serverApiUrl – the endpoint URL for WebTriadServices
        numberOfFilesInPackage – the size of the batch of files that will be gradually added to the submission package during the upload
        sizeChunk – the size of chunk of the file for upload in bytes
        dicomDisabled – disabling DICOM files support
        nonDicomDisabled – disabling Non-DICOM files support

    For example:

        {
            serverApiUrl: "http://cuv-triad-app.restonuat.local/api",
            numberOfFilesInPackage: 4,
            sizeChunk: 1024 * 1024 * 2,
            dicomsDisabled: false,
            nonDicomsDisabled: false
        }

5. Define function 'getSecurityToken', which is called for receiving a token before sending files to the server.

        var control = $("#uploadControl").uploaderFiles({
                            ...                   
                            getSecurityToken: function() {
                                return getToken();
                            },
                            ...  
                        });

    This function should return a string value of token, for example:

        bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6ImZ0QWZjSVozZjFIaUpHMlZCWS1sd0ZkOUlTdyJ9.eyJpc3MiOiJBQ1IiLCJhdWQiOiJhM2UwMjhiZjI0OWU0NTEwODQ4NzQwY2E1MmU0YTYwYyIsImV4cCI6MTUxMTIwMjMwNSwibmJmIjoxNTExMTU5MTA1LCJhY2Nlc3NMaXN0IjpbeyJDYXNlSWQiOiIqIiwiQ291cnNlTmFtZSI6IioiLCJPcmdhblN5c3RlbSI6IioiLCJPcmdhbkxvY2F0aW9uIjoiKiJ9XSwiY2xpZW50TmFtZSI6IkFJUlAiLCJzY29wZXMiOltbInVwbG9hZCIsInJldmlldyIsImRlbGV0ZSJdXX0.pcOMmWZRuek2HPVJ1J24W96HY87L93F7udgbldcrQ2VwAc29NBDgzrkm7aB2c9HnDBC3NJvPrtt-rDTYg5fkVwKIY_gFz0oasUq4FicuKezuIS5JYFW1ApeYly0_nadGVLKN1gb8tXO8xqS8ft3uSTF4cOZzfRurBVx112tHpxmX3cEEXKp7FwNktX7MqVPEHK8fUD9FiDLKZbzUtdltsdKAlOFgmfOw3M1XmRwPMyjv48cACkmZMbVxDi1J9997SDGQSyKUql4w0mCVsAHv28EKCmg9BlcuoQgu1yuFjdBJT6PhQGgikqTteRHsqkjhc6rskyTmgyKzd9O_64ITjTMEvGcL7ko6Iqlgo7_jDhJUSGGVR6f-2AlpvnizQNv22B-wcvjmZF26Sr-yS39Jc37iDdlI-ItHJjiPG10T_7TMfANQroNgGVL-120b1GQsr8xLM0ECsw7ec63Oe9s_WdlJM--TUtwRTx4Rfrfzm9o84A7CjQcWY8cXXIq_P6chwKoQOAfXp21yTKffPVl4rMVsCHxkqAstAaKvSDQ0UrbGh0GHH7GN4didmvB6tNUQ4qVSYiJNs3nZvyxy7r3rY859lDasGDpgGdgF0stryE7j6J-9g9utnH3Kywde3_Gi9vW58B5AN4BNoPNGhddbJVg1luXZQf-mjixmO9xm3fw

    Alternatively, to set a new token once it is necessary to call following method:

        control.uploaderFiles("setSecurityToken", token);

    ‘token’ is a string value.

    When using ‘setSecurityToken’ method, you must either not define 'getSecurityToken' function or to be ensure that 'getSecurityToken' returns null.

6. For adding of files for uploading to call the following method:

        control.uploaderFiles("addFiles", files);

    The value of ‘files’ is javascript Array consisting of objects File.

7. Define function ‘onFilesUploaded’, which is called after submitting files to the Central Server

        var control = $("#uploadControl").uploaderFiles({
                            ...                   
                            onFilesUploaded: function(rejectedFiles) {
                                console.log(rejectedFiles);
                            },
                            ...  
                        });

    This function provides a parameter ‘rejectedFiles’ that contains info about rejected files. Its JSON format:

        {
            "NumberOfCorruptedDicoms": 0,
            "NumberOfRejectedDicoms": 0,
            "NumberOfRejectedNonDicoms": 0,
            "NumberOfRejectedDicomDir": 0,
            "CorruptedDicoms": [], //string array of filenames
            "RejectedDicoms": [], //string array of filenames
            "RejectedNonDicoms": [] //string array of filenames
        }

8. Define ‘onErrorEvent’ function, which is called when any errors are getting.

        var control = $("#uploadControl").uploaderFiles({
                            ...                   
                            onErrorEvent: function(errorObj) {
                            let str = errorObj.date.toLocaleTimeString()
                                    + " | Error " + errorObj.step
                                    + ": " + errorObj.statusText
                                    + "." + errorObj.message;
                            console.log(str);
                        },                 
                        ...   
                        });

    This function provides a parameter ‘errorObj’ that contains info about error. Its properties:

        date – the date,
        step – the processing step of the sending process,
        statusText – the response's status message as returned by the server,
        message – the error message.

9. For getting current status of upload to call the following method:

        var isInProcess = control.uploaderFiles("getProcessingStatus");

    The function will return true if there are files which are submitting, and false if there are not.
