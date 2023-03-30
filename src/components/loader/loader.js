import Spinner from "../../assets/svgs/loader.svg";
const Loader = ({ size = 85 }) => {
  return (
    <div className="flex align-center justify-center py-2 select-none">
      <img width={size} alt="loader" height={size} src={Spinner} />
    </div>
  );
};

export default Loader;
