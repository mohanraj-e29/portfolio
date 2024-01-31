<script>
var tablinks=document.getElementsByClassName("tab-links");
var tabcontents=document.getElementsByClassName("tab-content");
function opentab(tabname)
{
 for(tablink of tablinks)
 {
    //tablink.classList.remove("ative-link");
 }
 for(tabcontent of tabcontents)
 {
   // tabcontent.classList.remove("ative-tab");
 }
 event.currentTarget.classList.add("ative-link");
 document.getElementById(tabname).classList.add("ative-tab");
}

</script>

<script>

var  sidemenu=document.getElementById("sidemenu");
function openmenu(){
  sidemenu.style.right="0";
}

function closemenu(){
  sidemenu.style.right="0";
}

</script>