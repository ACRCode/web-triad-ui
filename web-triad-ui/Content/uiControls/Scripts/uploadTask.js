function UploadTask(files, guidOfFilesSet) {
    this.guidOfFileSet = guidOfFilesSet;
    this.files = files;

    this.getHtml = function () {
        let self = this;

        var fileNames = self._getFileNames();
        return "<tr data-fileset-uid='" + self.guidOfFileSet + "'>" +
               "<td style='padding-left: 15px;'><div style='text-overflow: ellipsis;overflow: hidden;width: 300px;white-space: nowrap;'>" +
               fileNames +
               "</div></td>" +
               "<td style='text-align: center;'>" + self.files.length + "</td>" +
               "<td class='tc-parsing-progress' style='text-align: center;'></td>" +
               "<td style='text-align: center;'><span class='tc-delete-series'></span></td>" +
               "</tr>";
    }

    this._getFileNames = function () {
        let self = this;

        var count = self.files.length > 4 ? 3 : self.files.length;
        var filesNames = self.files[0].name;
        for (let i = 1; i < count; i++) {
            filesNames += ", " + self.files[i].name;
        }

        return filesNames;
    }

}