echo "Downloading MachineLearningCSV.zip..."
curl -L -o CICIDS2017_improved.zip https://intrusion-detection.distrinet-research.be/CNS2022/Datasets/CICIDS2017_improved.zip
curl -L \
  "https://huggingface.co/<YOUR_DATASET_REPO>/resolve/main/MachineLearningCSV.zip?download=true" \
  -o "$ZIP_FILE"
curl -L -o UNSW_NB15_testing-set.csv "https://raw.githubusercontent.com/ushukkla/nospammers/master/UNSW_NB15_testing-set.csv"
curl -L -o UNSW_NB15_training-set.csv "https://raw.githubusercontent.com/ushukkla/nospammers/master/UNSW_NB15_training-set.csv"

echo "Extracting dataset..."

unzip -o "$ZIP_FILE" -d "$DATASET_DIR"

rm "$ZIP_FILE"

echo "Dataset downloaded and extracted successfully."
