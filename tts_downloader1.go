package main

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func main() {
	// Đoạn hội thoại
	conversation := []string{
		"You",
		"Me",
		"I",
	}

	// Tạo thư mục để lưu file âm thanh
	outputDir := "audio_files"
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		fmt.Printf("Lỗi tạo thư mục: %v\n", err)
		return
	}

	// Xử lý từng câu
	for i, sentence := range conversation {
		// Giới hạn 200 từ
		words := strings.Fields(sentence)
		if len(words) > 200 {
			words = words[:200]
			sentence = strings.Join(words, " ")
		}

		// Tạo URL cho Google Translate TTS
		baseURL := "https://translate.google.com/translate_tts"
		params := url.Values{}
		params.Add("ie", "UTF-8")
		params.Add("q", sentence)
		params.Add("tl", "en")
		params.Add("client", "tw-ob")

		fullURL := baseURL + "?" + params.Encode()
		fmt.Printf("Đang tải câu %d: %s\n", i+1, sentence)

		// Tải file âm thanh
		if err := downloadAudio(fullURL, filepath.Join(outputDir, fmt.Sprintf("%s.mp3", sentence))); err != nil {
			fmt.Printf("Lỗi tải câu %d: %v\n", i+1, err)
		} else {
			fmt.Printf("Đã tải thành công câu %d\n", i+1)
		}

		// Nghỉ 1 giây giữa các request để tránh bị chặn
		time.Sleep(1 * time.Second)
	}

	fmt.Println("Hoàn thành tải tất cả file âm thanh!")
}

func downloadAudio(url, filename string) error {
	// Tạo HTTP client với User-Agent
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return fmt.Errorf("tạo request thất bại: %v", err)
	}

	// Thêm User-Agent để tránh bị chặn
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

	// Thực hiện request
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("request thất bại: %v", err)
	}
	defer resp.Body.Close()

	// Kiểm tra status code
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("HTTP error: %d", resp.StatusCode)
	}

	// Tạo file để lưu
	file, err := os.Create(filename)
	if err != nil {
		return fmt.Errorf("tạo file thất bại: %v", err)
	}
	defer file.Close()

	// Copy dữ liệu từ response vào file
	_, err = io.Copy(file, resp.Body)
	if err != nil {
		return fmt.Errorf("ghi file thất bại: %v", err)
	}

	return nil
}
