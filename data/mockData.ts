import { Site, SiteDetail, Person, PersonDetail } from '../types';

export const MOCK_SITES: Site[] = [
  { site_id: 1, site_name: 'Cầu Rồng', site_type: 'Bridge', latitude: 16.0613, longitude: 108.2274, address: 'An Hải, Sơn Trà, Đà Nẵng', established_year: 2013, status: 'Đang hoạt động', description: 'Cầu Rồng là cây cầu có kiến trúc độc đáo nhất Việt Nam, là con đường ngắn nhất nối sân bay quốc tế Đà Nẵng với những trục đường chính trong thành phố. Không chỉ đóng vai trò là đường giao thông huyết mạch của thành phố, cầu Rồng, với kiến trúc mô phỏng con rồng thời Lý đang vươn mình bay ra biển, là một trong những kiến trúc mang tính biểu tượng của thành phố Đà Nẵng', additional_info: { 'Chiều dài': '666m', 'Chiều rộng': '37.5m', 'Số làn xe': '6 làn', 'Kinh phí': '~1.500 tỷ VNĐ', 'Lịch phun lửa/nước': '21:00 Thứ 7, Chủ Nhật' } },
  { site_id: 2, site_name: 'Bà Nà Hills', site_type: 'Tourist Attraction', latitude: 15.9961, longitude: 107.9899 },
  { site_id: 3, site_name: 'Ngũ Hành Sơn', site_type: 'Mountain', latitude: 16.0044, longitude: 108.2635 },
  { site_id: 4, site_name: 'Bảo tàng Điêu khắc Chăm', site_type: 'Museum', latitude: 16.0592, longitude: 108.2255, address: 'Số 02, Đường 2 Tháng 9, Bình Hiên, Hải Châu, Đà Nẵng', established_year: 1915, status: 'Di tích quốc gia' },
  { site_id: 5, site_name: 'Bán đảo Sơn Trà', site_type: 'Nature Reserve', latitude: 16.1197, longitude: 108.3055 },
  { site_id: 6, site_name: 'Chợ Hàn', site_type: 'Market', latitude: 16.0700, longitude: 108.2251 },
  { site_id: 7, site_name: 'Cầu Sông Hàn', site_type: 'Bridge', latitude: 16.0725, longitude: 108.2270 },
  { site_id: 8, site_name: 'Bãi biển Mỹ Khê', site_type: 'Beach', latitude: 16.0544, longitude: 108.2488 },
  { site_id: 9, site_name: 'Nhà thờ Con Gà', site_type: 'Religious Site', latitude: 16.0645, longitude: 108.2235 },
  { site_id: 10, site_name: 'Công viên Châu Á', site_type: 'Amusement Park', latitude: 16.0354, longitude: 108.2223 },
  { site_id: 11, site_name: 'Thành Điện Hải', site_type: 'Historical Site', latitude: 16.0759, longitude: 108.2250, address: '45 Trần Phú, Thạch Thang, Hải Châu, Đà Nẵng', established_year: 1813, status: 'Di tích quốc gia đặc biệt' },
  { site_id: 12, site_name: 'Trường THPT Phan Châu Trinh', site_type: 'School', latitude: 16.0634, longitude: 108.2215, address: '154 Lê Lợi, Hải Châu 1, Hải Châu, Đà Nẵng', established_year: 1952, status: 'Đang hoạt động' }
];

export const MOCK_PERSONS: Person[] = [
    { person_id: 1, full_name: 'Nguyễn Bá Thanh', birth_year: 1953, death_year: 2015 },
    { person_id: 2, full_name: 'Henri Parmentier', birth_year: 1871, death_year: 1949 },
    { person_id: 3, full_name: 'Nguyễn Tri Phương', birth_year: 1800, death_year: 1873 },
    { person_id: 4, full_name: 'Phan Châu Trinh', birth_year: 1872, death_year: 1926 },
];


export const MOCK_SITE_DETAILS: SiteDetail[] = [
  {
    site_id: 1,
    site_name: 'Cầu Rồng',
    site_type: 'Bridge',
    latitude: 16.0613,
    longitude: 108.2274,
    address: 'An Hải, Sơn Trà, Đà Nẵng',
    established_year: 2013,
    status: 'Đang hoạt động',
    description: 'Cầu Rồng là cây cầu có kiến trúc độc đáo nhất Việt Nam, là con đường ngắn nhất nối sân bay quốc tế Đà Nẵng với những trục đường chính trong thành phố. Không chỉ đóng vai trò là đường giao thông huyết mạch của thành phố, cầu Rồng, với kiến trúc mô phỏng con rồng thời Lý đang vươn mình bay ra biển, là một trong những kiến trúc mang tính biểu tượng của thành phố Đà Nẵng',
    additional_info: { 'Chiều dài': '666m', 'Chiều rộng': '37.5m', 'Số làn xe': '6 làn', 'Kinh phí': '~1.500 tỷ VNĐ', 'Lịch phun lửa/nước': '21:00 Thứ 7, Chủ Nhật' },
    events: [
      {
        event_id: 103,
        event_name: 'Khởi công xây dựng',
        start_date: '2009-07-19',
        description: 'Dự án Cầu Rồng chính thức được khởi công xây dựng, với thiết kế độc đáo mô phỏng hình dáng con rồng thời Lý đang bay ra biển lớn. Đây là một trong những dự án trọng điểm dưới thời ông Nguyễn Bá Thanh làm Bí thư Thành ủy.',
        persons: [{ person_id: 1, full_name: 'Nguyễn Bá Thanh' }],
        media: [
            { media_id: 10, media_url: 'https://picsum.photos/id/145/400/300', media_type: 'image', caption: 'Lễ khởi công' },
            { media_id: 11, media_url: 'https://picsum.photos/id/57/400/300', media_type: 'image', caption: 'Công trường xây dựng' }
        ]
      },
      {
        event_id: 101,
        event_name: 'Khánh thành Cầu Rồng',
        start_date: '2013-03-29',
        description: 'Cầu Rồng được chính thức khánh thành và thông xe, trở thành một biểu tượng mới của thành phố Đà Nẵng.',
        persons: [{ person_id: 1, full_name: 'Nguyễn Bá Thanh' }],
        media: [
            { media_id: 12, media_url: 'https://picsum.photos/id/1078/400/300', media_type: 'image', caption: 'Lễ khánh thành' },
            { media_id: 200, media_url: 'https://www.youtube.com/watch?v=IMa_x2s_yE4', media_type: 'video', caption: 'Video tổng quan Cầu Rồng', thumbnail_url: 'https://i.ytimg.com/vi/IMa_x2s_yE4/hqdefault.jpg' },
            { media_id: 201, media_url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', media_type: 'video', caption: 'Video Cầu Rồng từ trên cao', thumbnail_url: 'https://picsum.photos/id/201/200/120' }
        ]
      },
      {
        event_id: 104,
        event_name: 'Lịch phun lửa, phun nước',
        start_date: '2013-06-01',
        description: 'Cầu Rồng bắt đầu lịch trình phun lửa và phun nước cố định vào 21:00 mỗi tối thứ Bảy, Chủ Nhật và các ngày lễ lớn, thu hút đông đảo người dân và du khách.',
        media: [
          { media_id: 1, media_url: 'https://picsum.photos/id/101/400/300', media_type: 'image', caption: 'Cầu Rồng phun lửa' },
          { media_id: 18, media_url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', media_type: 'video', caption: 'Video Cầu Rồng phun nước', thumbnail_url: 'https://picsum.photos/id/180/200/120' }
        ]
      },
       {
        event_id: 105,
        event_name: 'Đoạt giải thưởng thiết kế quốc tế',
        start_date: '2014-03-12',
        description: 'Thiết kế của Cầu Rồng được vinh danh tại giải thưởng FX International Interior Design Awards, hạng mục "Public space", khẳng định vị thế biểu tượng kiến trúc của Đà Nẵng.',
      },
      {
        event_id: 102,
        event_name: 'Lễ hội pháo hoa quốc tế',
        description: 'Cầu Rồng là một trong những địa điểm đẹp nhất để chiêm ngưỡng các màn trình diễn pháo hoa.',
        media: [
            { media_id: 2, media_url: 'https://picsum.photos/id/102/400/300', media_type: 'image', caption: 'Vẻ đẹp Cầu Rồng về đêm' }
        ]
      }
    ]
  },
  {
    site_id: 4,
    site_name: 'Bảo tàng Điêu khắc Chăm',
    site_type: 'Museum',
    latitude: 16.0592,
    longitude: 108.2255,
    address: 'Số 02, Đường 2 Tháng 9, Bình Hiên, Hải Châu, Đà Nẵng',
    established_year: 1915,
    status: 'Di tích quốc gia',
    events: [
      {
        event_id: 201,
        event_name: 'Thành lập bảo tàng',
        start_date: '1915',
        description: 'Bảo tàng được thành lập bởi Viện Viễn Đông Bác Cổ của Pháp, với sự đóng góp quan trọng của nhà khảo cổ học Henri Parmentier trong việc thu thập và bảo tồn các hiện vật của vương quốc Chăm Pa.',
        persons: [{ person_id: 2, full_name: 'Henri Parmentier' }],
        media: [
          { media_id: 3, media_url: 'https://picsum.photos/id/201/400/300', media_type: 'image', caption: 'Bên trong bảo tàng' },
          { media_id: 4, media_url: 'https://picsum.photos/id/202/400/300', media_type: 'image', caption: 'Tượng thần Shiva' }
        ]
      }
    ]
  },
   {
    site_id: 11,
    site_name: 'Thành Điện Hải',
    site_type: 'Historical Site',
    latitude: 16.0759,
    longitude: 108.2250,
    address: '45 Trần Phú, Thạch Thang, Hải Châu, Đà Nẵng',
    established_year: 1813,
    status: 'Di tích quốc gia đặc biệt',
    events: [
      {
        event_id: 301,
        event_name: 'Trận chiến Đà Nẵng (1858–1860)',
        start_date: '1858-08-31',
        end_date: '1860-03-23',
        description: 'Dưới sự chỉ huy của danh tướng Nguyễn Tri Phương, Thành Điện Hải là phòng tuyến quan trọng trong cuộc chiến chống liên quân Pháp - Tây Ban Nha xâm lược Đà Nẵng, thể hiện tinh thần kháng chiến quật cường của quân và dân ta.',
        persons: [{ person_id: 3, full_name: 'Nguyễn Tri Phương' }],
        media: [
          { media_id: 5, media_url: 'https://picsum.photos/id/301/400/300', media_type: 'image', caption: 'Di tích Thành Điện Hải ngày nay' },
          { media_id: 15, media_url: 'https://picsum.photos/id/1073/400/300', media_type: 'image', caption: 'Một bức tranh mô tả trận chiến' },
          { media_id: 16, media_url: 'https://picsum.photos/id/835/400/300', media_type: 'image', caption: 'Sơ đồ Thành Điện Hải' },
          { media_id: 17, media_url: 'https://picsum.photos/id/10/400/300', media_type: 'image', caption: 'Cận cảnh súng thần công' }
        ]
      }
    ]
  },
  {
    site_id: 12,
    site_name: 'Trường THPT Phan Châu Trinh',
    site_type: 'School',
    latitude: 16.0634,
    longitude: 108.2215,
    address: '154 Lê Lợi, Hải Châu 1, Hải Châu, Đà Nẵng',
    established_year: 1952,
    status: 'Đang hoạt động',
    events: [
        {
            event_id: 401,
            event_name: 'Thành lập trường',
            start_date: '1952-09-15',
            description: 'Trường được thành lập, ban đầu mang tên Collège de Tourane. Sau này trường được vinh dự mang tên nhà chí sĩ yêu nước Phan Châu Trinh, người có tư tưởng canh tân đất nước sâu sắc.',
            persons: [{person_id: 4, full_name: 'Phan Châu Trinh'}],
            media: [
                { media_id: 20, media_url: 'https://picsum.photos/id/23/400/300', media_type: 'image', caption: 'Cổng trường Phan Châu Trinh' }
            ]
        }
    ]
  }
];

export const MOCK_PERSON_DETAILS: PersonDetail[] = [
    {
        person_id: 1,
        full_name: 'Nguyễn Bá Thanh',
        birth_year: 1953,
        death_year: 2015,
        biography: 'Ông Nguyễn Bá Thanh là một chính trị gia nổi tiếng của Việt Nam, người đã có những đóng góp to lớn cho sự phát triển vượt bậc của thành phố Đà Nẵng trong vai trò Chủ tịch UBND và Bí thư Thành ủy. Ông được người dân yêu mến bởi phong cách làm việc quyết liệt, dám nghĩ dám làm và những phát ngôn thẳng thắn.',
        additional_info: {
            'Quê quán': 'Xã Hòa Tiến, huyện Hòa Vang, thành phố Đà Nẵng',
            'Trình độ học vấn': 'Tiến sĩ Quản lý kinh tế nông nghiệp',
            'Lý luận chính trị': 'Cao cấp Lý luận chính trị',
            'Nghề nghiệp, chức vụ': 'Ủy viên BCH TW Đảng, Bí thư Thành ủy, Chủ tịch HĐND thành phố Đà nẵng, Trưởng Đoàn ĐBQH thành phố Đà Nẵng; Ủy viên Ủy ban Tài chính, Ngân sách của Quốc hội, Trưởng Ban Nội chính Trung ương'
        },
        media: [
            { media_id: 101, media_url: 'https://picsum.photos/id/40/400/400', media_type: 'image', caption: 'Chân dung ông Nguyễn Bá Thanh' }
        ],
        events: [
            {
                event_id: 102,
                event_name: 'Giữ chức vụ Bí thư Thành ủy Đà Nẵng',
                start_date: '2003-01-01',
                description: 'Trong giai đoạn này, ông đã đưa ra nhiều quyết sách đột phá, góp phần thay đổi mạnh mẽ diện mạo đô thị và phát triển kinh tế - xã hội của Đà Nẵng, được người dân ghi nhận và yêu mến.'
            },
            {
                event_id: 101,
                event_name: 'Khánh thành Cầu Rồng',
                start_date: '2013-03-29',
                description: 'Là một trong những công trình biểu tượng của Đà Nẵng được xây dựng và khánh thành dưới thời ông Nguyễn Bá Thanh làm lãnh đạo, thể hiện tầm nhìn và quyết tâm thay đổi diện mạo đô thị.',
                related_site_id: 1,
                related_site_name: 'Cầu Rồng',
                media: [
                    { media_id: 1001, media_url: 'https://picsum.photos/id/1084/400/300', media_type: 'image', caption: 'Ông Nguyễn Bá Thanh tại lễ khánh thành' }
                ]
            }
        ]
    },
    {
        person_id: 3,
        full_name: 'Nguyễn Tri Phương',
        birth_year: 1800,
        death_year: 1873,
        biography: 'Nguyễn Tri Phương là một danh tướng triều Nguyễn, một nhà quân sự xuất sắc. Ông nổi tiếng với vai trò tổng chỉ huy quân đội triều đình chống lại cuộc xâm lược của Pháp tại Đà Nẵng (1858) và sau này là tại Hà Nội. Ông là tấm gương sáng về lòng yêu nước và tinh thần kiên trung, bất khuất.',
        media: [
            { media_id: 102, media_url: 'https://picsum.photos/id/45/400/400', media_type: 'image', caption: 'Tượng đài Nguyễn Tri Phương' }
        ],
        events: [
             {
                event_id: 301,
                event_name: 'Tổng chỉ huy mặt trận Đà Nẵng',
                start_date: '1858-08-31',
                description: 'Ông được vua Tự Đức cử làm tổng chỉ huy quân đội chống lại liên quân Pháp - Tây Ban Nha tại Đà Nẵng. Dưới sự lãnh đạo của ông, quân và dân ta đã cầm chân giặc tại đây trong gần 2 năm.',
                related_site_id: 11,
                related_site_name: 'Thành Điện Hải',
                media: [
                    { media_id: 1002, media_url: 'https://picsum.photos/id/1073/400/300', media_type: 'image', caption: 'Tranh mô tả trận chiến Đà Nẵng' },
                    { media_id: 1003, media_url: 'https://www.youtube.com/watch?v=e_-_j7g-iXU', media_type: 'video', caption: 'Video tư liệu về cuộc kháng chiến', thumbnail_url: 'https://i.ytimg.com/vi/e_-_j7g-iXU/hqdefault.jpg'}
                ]
            },
            {
                event_id: 302,
                event_name: 'Tuẫn tiết tại Hà Nội',
                start_date: '1873-11-20',
                description: 'Sau khi thành Hà Nội thất thủ lần thứ nhất, ông bị giặc bắt. Để giữ trọn khí tiết, ông đã tuyệt thực và qua đời.',
            }
        ]
    }
];