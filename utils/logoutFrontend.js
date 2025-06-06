const logoutBtn = document.getElementById("logoutBtn");
logoutBtn.addEventListener("click", async () => {
  try {
    const response = await fetch("http://localhost:3000/logout");
    if (!response.ok) {
      throw new Error(`Response status:${response.status}`);
    }
    const json = await response.json();
    console.log(json);

    window.location.href = "/";
  } catch (error) {
    console.log(error);
  }
});
