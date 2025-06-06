function fetchApiBtnClick(btn, route) {
  btn.addEventListener("click", async () => {
    try {
      const response = await fetch(
        `http://localhost:${process.env.PORT}/${route}`
      );
      if (!response.ok) {
        throw new Error(`Response status:${response.status}`);
      }
      const json = response.json;
      console.log(json);
    } catch (error) {
      console.log(error);
    }
  });
}
export default fetchApiBtnClick;
