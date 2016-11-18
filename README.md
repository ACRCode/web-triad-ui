# UI Controls for Web Triad 

This instruction contains information on the use of ui-controls for Review and Uploading of images.

# Installation

Necessary files to use controls are located in the folder [distr](https://github.com/acrscm/web-triad-ui/tree/master/dist/)

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
Include jQuery, jQueryUI scripts and following files on the page

```sh
<script src="~/*your folder*/uiControls/Scripts/webTriadService.js"></script>
<script src="~/*your folder*/uiControls/Scripts/reviewControl.js"></script>
<link rel="stylesheet" href="~/*your folder*/uiControls/Css/tcStyle.css">
```

Create ui-control for any jquery element and assign the necessary business parameters
to *reviewData* variable and define function *'getSecurityToken'* which will be called 
for receiving a token before each sending a request for the server.

```sh
var control = $("#reviewControl").reviewerSubmittedFiles({
              reviewData: reviewData,
              getSecurityToken: function() {
                  return getToken();
                  }
              });
```

For updating of data it is necessary to call following method 

```sh
control.reviewerSubmittedFiles("update");
```

and if it is necessary to define a new business parameters.

```sh
control.reviewerSubmittedFiles("update", {
              reviewData: reviewData
          });
```

For setting new token it is necessary to call following method 
(when using this method, you must either not define *'getSecurityToken'* function 
or that *'getSecurityToken'* returns null) 

```sh
control.reviewerSubmittedFiles("setSecurityToken", token);
```

## Uploading control
Include jQuery, jQueryUI scripts and following files on the page

```sh
<script src="~/Content/uiControls/Scripts/dicomApi.js"></script>
<script src="~/Content/uiControls/Scripts/webTriadService.js"></script>
<script src="~/Content/uiControls/Scripts/uploadControl.js"></script>
<link rel="stylesheet" href="~/Content/uiControls/Css/tcStyle.css">
```

Create ui-control for any jquery element, assign the necessary business parameters
to *uploadData* variable, define function *'setAvailabilityStatusAddingFiles'* which will be called 
when the possibility of addition of new files for uploading is changed, 
and define function *'getSecurityToken'* which will be called 
for receiving a token before each sending a request for the server.

```sh
var control = $("#uploadControl").uploaderFiles({
                    uploadData: uploadData,
                    setAvailabilityStatusAddingFiles: function(isAvailable) {
                        $("#selectFiles").prop("disabled", !isAvailable);
                    },
                    getSecurityToken: function() {
                        return getToken();
                    }
                });
```

For adding of files for uploading to call following method

```sh
control.uploaderFiles("addFiles", files);
```

For setting new token it is necessary to call following method 
(when using this method, you must either not define *'getSecurityToken'* function 
or that *'getSecurityToken'* returns null) 

```sh
control.uploaderFiles("setSecurityToken", token);
```



