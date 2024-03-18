import { Modal } from "react-bootstrap";
import Loader from "../../components/loader/loader";
import { getUserStats, syncUserProgress } from "../../api/company";
import { useEffect, useState } from "react";
import { Pie } from "react-chartjs-2";
import { StylesConfig } from ".";

export const MoreDetailsModal = ({
  showDetailsModal,
  setShowDetailsModal,
  init,
}) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const handleClose = () => {
    setStats(null);
    setShowDetailsModal(null);
  };

  const getStats = async () => {
    setLoading(true);
    const stats = await getUserStats({
      learningpath: showDetailsModal?.learningpath,
      userid: showDetailsModal?.userid,
    });
    setStats(stats);
    setLoading(false);
  };

  const syncProgress = async () => {
    setLoading(true);
    await syncUserProgress({
      learningpath: showDetailsModal?.learningpath,
      userid: showDetailsModal?.userid,
    });
    const stats = await getUserStats({
      learningpath: showDetailsModal?.learningpath,
      userid: showDetailsModal?.userid,
    });
    init();
    setStats(stats);
    setLoading(false);
  };

  useEffect(() => {
    if (showDetailsModal) getStats();
  }, [showDetailsModal]);

  return (
    <Modal
      centered
      show={showDetailsModal}
      onHide={handleClose}
      style={{
        background: "#00000030",
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          minHeight: 500,
          maxHeight: 800,
          overflow: "auto",
        }}
        className="rounded border"
      >
        {loading && <Loader />}
        {!loading && stats && (
          <>
            <div className="flex flex-column align-center justify-center w-100 p-5">
              <p className="mb-2">
                Showing progress for {showDetailsModal?.email},
              </p>
              <Pie
                data={{
                  labels: Object.keys(stats?.statusCount),

                  datasets: [
                    {
                      data: Object.values(stats?.statusCount),
                      backgroundColor: Object.keys(stats?.statusCount)?.map(
                        (type) => StylesConfig?.[type]?.clr
                      ),
                    },
                  ],
                }}
              />

              <div className="flex flex-column mt-4">
                {Object.keys(stats?.statusCount).map((analytic) => (
                  <p className="my-1 w-100">
                    {analytic.toLowerCase()} : {stats?.statusCount?.[analytic]}
                  </p>
                ))}
              </div>

              <button className="btn btn-primary my-2" onClick={syncProgress}>
                Sync Progress <i class="bi bi-arrow-repeat pointer m-0"></i>
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
