// deno-lint-ignore-file no-var no-inner-declarations
function printBookmarks(bookmarkList, level) {
  level = level || 0;
  var indent = Array(level + 1).join("  ");

  if (bookmarkList.children) {
    for (var i = 0; i < bookmarkList.children.length; i++) {
      var bookmark = bookmarkList.children[i];
      console.println(indent + bookmark.name);
      printBookmarks(bookmark, level + 1);
    }
  }
}

printBookmarks(this.bookmarkRoot);
